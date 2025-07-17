from fastapi import APIRouter

from . import (
    account,
    admin,
    auth,
    cart,
    checkout,
    merchant,
    order,
    product,
    transaction,
    user,
    withdrawal,
)

all_routers: list[APIRouter] = [
    auth.router,
    account.router,
    admin.router,
    cart.router,
    checkout.router,
    merchant.router,
    order.router,
    withdrawal.router,
    product.router,
    transaction.router,
    user.router,
]
