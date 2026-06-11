from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Bolu API")

users = []
groups = []
expenses = []


class UserCreate(BaseModel):
    name: str


class GroupCreate(BaseModel):
    name: str


class ExpenseCreate(BaseModel):
    group_id: int
    paid_by: int
    amount: float
    description: str
    participants: list[int]


@app.get("/")
def home():
    return {"message": "Welcome to Bolu API"}


@app.post("/users")
def create_user(user: UserCreate):
    new_user = {
        "id": len(users) + 1,
        "name": user.name
    }
    users.append(new_user)
    return new_user


@app.get("/users")
def get_users():
    return users


@app.post("/groups")
def create_group(group: GroupCreate):
    new_group = {
        "id": len(groups) + 1,
        "name": group.name,
        "members": []
    }
    groups.append(new_group)
    return new_group


@app.post("/groups/{group_id}/members/{user_id}")
def add_member(group_id: int, user_id: int):
    group = next((g for g in groups if g["id"] == group_id), None)

    if not group:
        return {"error": "Group not found"}

    if user_id not in group["members"]:
        group["members"].append(user_id)

    return group


@app.get("/groups")
def get_groups():
    return groups


@app.post("/expenses")
def create_expense(expense: ExpenseCreate):
    split_amount = expense.amount / len(expense.participants)

    new_expense = {
        "id": len(expenses) + 1,
        "group_id": expense.group_id,
        "paid_by": expense.paid_by,
        "amount": expense.amount,
        "description": expense.description,
        "participants": expense.participants,
        "split_amount": split_amount
    }

    expenses.append(new_expense)
    return new_expense


@app.get("/expenses")
def get_expenses():
    return expenses


@app.get("/groups/{group_id}/balances")
def get_balances(group_id: int):
    balances = {}

    group_expenses = [e for e in expenses if e["group_id"] == group_id]

    for expense in group_expenses:
        paid_by = expense["paid_by"]
        split_amount = expense["split_amount"]

        for participant in expense["participants"]:
            if participant != paid_by:
                key = (participant, paid_by)
                balances[key] = balances.get(key, 0) + split_amount

    result = []

    for (from_user, to_user), amount in balances.items():
        result.append({
            "from_user": from_user,
            "to_user": to_user,
            "amount": round(amount, 2)
        })

    return result