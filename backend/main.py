from typing import Literal, Optional, Union

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import Base, engine, SessionLocal
from backend.models import User, Group, GroupMember, Expense, ExpenseParticipant, Settlement

app = FastAPI(title="Bolu API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

def ensure_runtime_columns():
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE expenses "
                "ADD COLUMN IF NOT EXISTS split_type VARCHAR NOT NULL DEFAULT 'equal'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE expense_participants "
                "ADD COLUMN IF NOT EXISTS share_amount DOUBLE PRECISION NOT NULL DEFAULT 0"
            )
        )
        connection.execute(
            text(
                """
                UPDATE expense_participants ep
                SET share_amount = e.amount / participant_counts.count
                FROM expenses e
                JOIN (
                    SELECT expense_id, COUNT(*) AS count
                    FROM expense_participants
                    GROUP BY expense_id
                ) participant_counts ON participant_counts.expense_id = e.id
                WHERE ep.expense_id = e.id
                AND e.split_type = 'equal'
                AND ep.share_amount = 0
                AND participant_counts.count > 0
                """
            )
        )


ensure_runtime_columns()


class ExpenseParticipantInput(BaseModel):
    user_id: int
    amount: Optional[float] = None
    percentage: Optional[float] = None


class ExpenseCreate(BaseModel):
    group_id: int
    paid_by: int
    amount: float
    description: str
    split_type: Literal["equal", "percentage", "exact"] = "equal"
    participants: list[Union[int, ExpenseParticipantInput]]

class ExpenseUpdate(BaseModel):
    paid_by: int
    amount: float
    description: str
    split_type: Literal["equal", "percentage", "exact"] = "equal"
    participants: list[Union[int, ExpenseParticipantInput]]

class SettlementCreate(BaseModel):
    group_id: int
    from_user: int
    to_user: int
    amount: float

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_participants(
    amount: float,
    split_type: str,
    participants: list[Union[int, ExpenseParticipantInput]]
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    if len(participants) == 0:
        raise HTTPException(status_code=400, detail="Choose at least one participant")

    normalized = []

    for participant in participants:
        if isinstance(participant, int):
            normalized.append({
                "user_id": participant,
                "amount": None,
                "percentage": None
            })
        else:
            normalized.append({
                "user_id": participant.user_id,
                "amount": participant.amount,
                "percentage": participant.percentage
            })

    user_ids = [participant["user_id"] for participant in normalized]

    if len(user_ids) != len(set(user_ids)):
        raise HTTPException(status_code=400, detail="Participants must be unique")

    if split_type == "equal":
        share_amount = amount / len(normalized)
        return [
            {"user_id": participant["user_id"], "share_amount": share_amount}
            for participant in normalized
        ]

    if split_type == "exact":
        exact_total = 0
        exact_splits = []

        for participant in normalized:
            participant_amount = participant["amount"]

            if participant_amount is None or participant_amount < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Exact split amounts must be zero or greater"
                )

            exact_total += participant_amount
            exact_splits.append({
                "user_id": participant["user_id"],
                "share_amount": participant_amount
            })

        if round(exact_total, 2) != round(amount, 2):
            raise HTTPException(
                status_code=400,
                detail="Exact split amounts must add up to the expense amount"
            )

        return exact_splits

    percentage_total = 0
    percentage_splits = []

    for participant in normalized:
        percentage = participant["percentage"]

        if percentage is None or percentage < 0:
            raise HTTPException(
                status_code=400,
                detail="Percentages must be zero or greater"
            )

        percentage_total += percentage
        percentage_splits.append({
            "user_id": participant["user_id"],
            "share_amount": amount * percentage / 100
        })

    if round(percentage_total, 2) != 100:
        raise HTTPException(
            status_code=400,
            detail="Percentages must add up to 100"
        )

    return percentage_splits


def serialize_expense(expense: Expense, db: Session):
    participants = (
        db.query(ExpenseParticipant)
        .filter(ExpenseParticipant.expense_id == expense.id)
        .all()
    )

    return {
        "id": expense.id,
        "group_id": expense.group_id,
        "paid_by": expense.paid_by,
        "amount": expense.amount,
        "description": expense.description,
        "split_type": expense.split_type,
        "participants": [
            {
                "user_id": participant.user_id,
                "share_amount": participant.share_amount
            }
            for participant in participants
        ]
    }


@app.get("/")
def home():
    return {"message": "Welcome to Bolu API"}


@app.post("/users")
def create_user(name: str, db: Session = Depends(get_db)):
    user = User(name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@app.post("/groups")
def create_group(name: str, created_by: int, db: Session = Depends(get_db)):
    clean_name = name.strip()

    if len(clean_name) == 0:
        return {"error": "Group name cannot be empty"}

    existing_group = (
        db.query(Group)
        .filter(Group.created_by == created_by)
        .filter(Group.name == clean_name)
        .first()
    )

    if existing_group:
        return {"error": "You already have a group with this name"}

    group = Group(name=clean_name, created_by=created_by)
    db.add(group)
    db.commit()
    db.refresh(group)

    return group


@app.get("/groups")
def get_groups(db: Session = Depends(get_db)):
    return db.query(Group).all()

@app.get("/groups/{group_id}")
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()

    if group is None:
        return {"error": "Group not found"}

    return group

@app.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()

    if group is None:
        return {"error": "Group not found"}

    # Delete related expense participants first
    group_expenses = db.query(Expense).filter(Expense.group_id == group_id).all()

    for expense in group_expenses:
        db.query(ExpenseParticipant).filter(
            ExpenseParticipant.expense_id == expense.id
        ).delete()

    # Delete expenses, members, settlements, then group
    db.query(Expense).filter(Expense.group_id == group_id).delete()
    db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
    db.query(Settlement).filter(Settlement.group_id == group_id).delete()

    db.delete(group)
    db.commit()

    return {"message": "Group deleted"}

@app.post("/groups/{group_id}/members/{user_id}")
def add_member_to_group(group_id: int, user_id: int, db: Session = Depends(get_db)):
    existing_member = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
        .first()
    )

    if existing_member:
        return {"error": "This member is already in the group"}

    member = GroupMember(group_id=group_id, user_id=user_id)

    db.add(member)
    db.commit()
    db.refresh(member)

    return member

@app.delete("/groups/{group_id}/members/{user_id}")
def delete_member_from_group(group_id: int, user_id: int, db: Session = Depends(get_db)):
    member = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
        .first()
    )

    if member is None:
        return {"error": "Member not found in this group"}

    # Do not allow deleting a member who paid for expenses in this group
    paid_expense = (
        db.query(Expense)
        .filter(
            Expense.group_id == group_id,
            Expense.paid_by == user_id
        )
        .first()
    )

    if paid_expense:
        return {"error": "Cannot remove member because they paid for an expense"}

    # Do not allow deleting a member who participates in expenses in this group
    group_expenses = db.query(Expense).filter(Expense.group_id == group_id).all()

    for expense in group_expenses:
        participant = (
            db.query(ExpenseParticipant)
            .filter(
                ExpenseParticipant.expense_id == expense.id,
                ExpenseParticipant.user_id == user_id
            )
            .first()
        )

        if participant:
            return {"error": "Cannot remove member because they are part of an expense"}

    db.delete(member)
    db.commit()

    return {"message": "Member removed from group"}

@app.get("/groups/{group_id}/members")
def get_group_members(group_id: int, db: Session = Depends(get_db)):
    members = (
        db.query(User)
        .join(GroupMember, User.id == GroupMember.user_id)
        .filter(GroupMember.group_id == group_id)
        .all()
    )

    return members

@app.post("/expenses")
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    participant_splits = normalize_participants(
        expense.amount,
        expense.split_type,
        expense.participants
    )

    new_expense = Expense(
        group_id=expense.group_id,
        paid_by=expense.paid_by,
        amount=expense.amount,
        description=expense.description.strip(),
        split_type=expense.split_type
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    for participant_split in participant_splits:
        participant = ExpenseParticipant(
            expense_id=new_expense.id,
            user_id=participant_split["user_id"],
            share_amount=participant_split["share_amount"]
        )
        db.add(participant)

    db.commit()

    return serialize_expense(new_expense, db)

@app.put("/expenses/{expense_id}")
def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    db: Session = Depends(get_db)
):
    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id)
        .first()
    )

    if expense is None:
        return {"error": "Expense not found"}

    participant_splits = normalize_participants(
        expense_update.amount,
        expense_update.split_type,
        expense_update.participants
    )

    expense.description = expense_update.description
    expense.amount = expense_update.amount
    expense.paid_by = expense_update.paid_by
    expense.split_type = expense_update.split_type

    db.query(ExpenseParticipant).filter(
        ExpenseParticipant.expense_id == expense.id
    ).delete()

    for participant_split in participant_splits:
        participant = ExpenseParticipant(
            expense_id=expense.id,
            user_id=participant_split["user_id"],
            share_amount=participant_split["share_amount"]
        )
        db.add(participant)

    db.commit()
    db.refresh(expense)

    return serialize_expense(expense, db)

@app.get("/expenses")
def get_expenses(db: Session = Depends(get_db)):
    expenses = db.query(Expense).all()
    return [serialize_expense(expense, db) for expense in expenses]

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()

    if expense is None:
        return {"error": "Expense not found"}

    db.query(ExpenseParticipant).filter(
        ExpenseParticipant.expense_id == expense_id
    ).delete()

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted"}

@app.get("/groups/{group_id}/balances")
def get_group_balances(group_id: int, db: Session = Depends(get_db)):
    group_expenses = db.query(Expense).filter(Expense.group_id == group_id).all()

    balances = {}

    for expense in group_expenses:
        participants = (
            db.query(ExpenseParticipant)
            .filter(ExpenseParticipant.expense_id == expense.id)
            .all()
        )

        if len(participants) == 0:
            continue

        for participant in participants:
            if participant.user_id != expense.paid_by:
                key = (participant.user_id, expense.paid_by)
                balances[key] = balances.get(key, 0) + participant.share_amount

    group_settlements = db.query(Settlement).filter(Settlement.group_id == group_id).all()

    for settlement in group_settlements:
        key = (settlement.from_user, settlement.to_user)
        balances[key] = balances.get(key, 0) - settlement.amount

    simplified_balances = {}

    for (from_user, to_user), amount in balances.items():
        reverse_key = (to_user, from_user)

        if reverse_key in simplified_balances:
            simplified_balances[reverse_key] -= amount
        else:
            simplified_balances[(from_user, to_user)] = amount

    balances = simplified_balances

    result = []

    for (from_user_id, to_user_id), amount in balances.items():

        if round(amount, 2) <= 0:
            continue

        from_user = db.query(User).filter(User.id == from_user_id).first()
        to_user = db.query(User).filter(User.id == to_user_id).first()

        result.append({
            "from_user_id": from_user_id,
            "from_user_name": from_user.name if from_user else None,
            "to_user_id": to_user_id,
            "to_user_name": to_user.name if to_user else None,
            "amount": round(amount, 2)
        })

    return result

@app.post("/settlements")
def create_settlement(settlement: SettlementCreate, db: Session = Depends(get_db)):
    new_settlement = Settlement(
        group_id=settlement.group_id,
        from_user=settlement.from_user,
        to_user=settlement.to_user,
        amount=settlement.amount
    )

    db.add(new_settlement)
    db.commit()
    db.refresh(new_settlement)

    return new_settlement


@app.get("/settlements")
def get_settlements(db: Session = Depends(get_db)):
    return db.query(Settlement).all()
