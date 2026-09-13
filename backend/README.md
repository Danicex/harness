# Harness backend

Auth is the template's multi-tenant scheme: `AuthIdentity` (login) + role-specific
profile tables (`Company`, `StaffProfile`, `UserProfile`, `AdminProfile`). A
`Company` **is** the tenant — every domain row below carries `company_id`, and
every route resolves it via `app.auth.authentication.scope_to_company`
(admins get `None`, i.e. no filter).

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in POSTGRES_URL, SECRET_KEY, RESEND_API_KEY, etc.

# api
fastapi dev app/main.py

# background jobs (separate terminals)
celery -A app.celery_app worker --loglevel=info
celery -A app.celery_app beat --loglevel=info
```

Postgres and Redis need to be running locally (or point the URLs in `.env` at
hosted instances).

## Auth quick reference (unchanged, already correct)

- `POST /auth/signup/company` — hotel owner signs up, becomes tenant owner
- `POST /auth/staff/invite` — company creates a staff login (requires company JWT)
- `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`

All routes below require `Authorization: Bearer <token>` unless noted, and are
scoped to whichever company the token belongs to.

## Inventory

- `POST /product/` — create a product (`name, price, quantity, ...`); status
  is derived from quantity (`available` / `out_of_stock`).
- `GET /product/` — list.
- `POST /sales/` — record a sale (`product_id, quantity_sold`); deducts stock
  and recomputes the product's status in the same transaction.
- `GET /sales/` — sales history.

## Campaigns (SMS / Email)

- `POST /campaign/` — create a campaign. Resolves the audience (all customers,
  or an explicit `customer_ids` list) into `CampaignRecipient` rows immediately
  — that's the durable history record — then dispatches now via Celery, or
  leaves it `QUEUED` for `scheduled_at` if given.
- `GET /campaign/` — list campaigns.
- `GET /campaign/{id}/history` — per-recipient delivery status (`sent`/`failed`,
  provider message id, error).
- Email goes out via **Resend**, SMS via **Termii** (`app/services/send_sms.py`)
  — cheap, no-preregistration SMS route for Nigerian numbers. Swap the
  implementation there if you'd rather use Africa's Talking/Twilio.
- Celery beat (`app/celery_app.py`) runs `dispatch_due_campaigns` every minute
  to catch anything scheduled for the past.

## Staff — check-in / shifts / tasks / notifications

- `POST /staff/check-in`, `POST /staff/check-out/{check_in_id}`, `GET /staff/check-ins`
- `POST /staff/shifts` (company only), `GET /staff/shifts`
- `POST /staff/tasks` (company assigns), `GET /staff/tasks`, `PATCH /staff/tasks/{id}` (staff updates own status)
- `POST /staff/notify` (company, broadcast or targeted), `GET /staff/notifications`, `POST /staff/notifications/{id}/read`

## AI receptionist

- `WS /chat/ws/{company_id}` — public-facing (no auth; embed on the hotel's
  own site). Answers only from that company's `HotelProfile`, available
  `Room`s, `Product`s, and any extra `Dataset` Q&A pairs. Can call the
  `book_room` tool, which lands in the same `RoomBooking` table as the staff
  booking endpoint below (`booked_via` distinguishes the source).
- `PUT /hotel_profile/`, `GET /hotel_profile/` — the context the chatbot reads.
- `POST /room/`, `GET /room/`
- `POST /booking/`, `GET /booking/` — staff-facing booking (same core
  `book_room()` function the chatbot calls).
- `POST /customer/`, `GET /customer/` — mainly campaign audience + repeat-guest lookup.

## Notes / things you'll still want to do

- Not implemented (out of scope per your instructions): file/image upload
  endpoints, update/delete CRUD beyond what's listed, blog/inbox/call-log/
  analytics routers from the old `server` app — none of those were part of
  the 4 requested features, and the copies in the template were broken
  (importing models that don't exist), so they were removed rather than fixed.
- `Dataset` model exists for extra chatbot Q&A content but has no CRUD route
  yet — add one the same way `hotel_profile.py` does if you need it.
- Frontend is untouched.
