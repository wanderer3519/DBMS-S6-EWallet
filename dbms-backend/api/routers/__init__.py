from fastapi import APIRouter

from . import accounts, auth

all_routers: list[APIRouter] = [auth.router, accounts.router]
