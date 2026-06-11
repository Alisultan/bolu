from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import Base, engine, SessionLocal
from backend.models import User, Group, GroupMember, Expense, ExpenseParticipant

app = FastAPI(title="Bolu API")

Base.metadata.create_all(bind=engine)

class ExpenseCreate(BaseModel):
    group_id: int
    paid_by: int
    amount: float
    description: str
    participants: list[int]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
    group = Group(name=name, created_by=created_by)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@app.get("/groups")
def get_groups(db: Session = Depends(get_db)):
    return db.query(Group).all()

@app.post("/groups/{group_id}/members/{user_id}")
def add_member_to_group(group_id: int, user_id: int, db: Session = Depends(get_db)):
    member = GroupMember(group_id=group_id, user_id=user_id)

    db.add(member)
    db.commit()
    db.refresh(member)

    return member


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
    new_expense = Expense(
        group_id=expense.group_id,
        paid_by=expense.paid_by,
        amount=expense.amount,
        description=expense.description
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    for user_id in expense.participants:
        participant = ExpenseParticipant(
            expense_id=new_expense.id,
            user_id=user_id
        )
        db.add(participant)

    db.commit()

    return {
        "id": new_expense.id,
        "group_id": new_expense.group_id,
        "paid_by": new_expense.paid_by,
        "amount": new_expense.amount,
        "description": new_expense.description,
        "participants": expense.participants
    }


@app.get("/expenses")
def get_expenses(db: Session = Depends(get_db)):
    return db.query(Expense).all()

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

        split_amount = expense.amount / len(participants)

        for participant in participants:
            if participant.user_id != expense.paid_by:
                key = (participant.user_id, expense.paid_by)
                balances[key] = balances.get(key, 0) + split_amount

    result = []

    for (from_user_id, to_user_id), amount in balances.items():
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