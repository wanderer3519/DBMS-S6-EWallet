from fastapi import APIRouter

from . import (
    account,
    admin,
    auth,
    cart,
    checkout,
    merchant,
    order,
    process_withdrawal,
    product,
    redeem_rewards,
    transaction,
    user,
)

all_routers: list[APIRouter] = [
    auth.router,
    account.router,
    admin.router,
    cart.router,
    checkout.router,
    merchant.router,
    order.router,
    process_withdrawal.router,
    product.router,
    redeem_rewards.router,
    transaction.router,
    user.router
]
