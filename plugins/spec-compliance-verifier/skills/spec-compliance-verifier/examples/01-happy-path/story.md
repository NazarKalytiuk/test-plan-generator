# PROJ-1001 — Create order endpoint

**Type:** User Story
**Reporter:** Product Owner
**Assignee:** Backend

## As a / in order to / I want

As an authenticated **customer**, in order to **record my intent to purchase and receive an order id I can reference later**, I want to **submit a POST /orders request with amount and currency and receive a 201 Created response containing the new order id and its initial status**.

## Acceptance Criteria

- **AC-1** (happy path). Given an authenticated customer, when they `POST /orders` with body `{amount, currency}` where `amount > 0` and `currency` is a valid ISO-4217 three-letter code, then the response is `201 Created` with body `{id, status: "PENDING", amount, currency}` where `id` is a UUID v4, and a row is persisted in the `orders` table with `status = PENDING`.
- **AC-2** (amount must be positive). Given an authenticated customer, when they `POST /orders` with `amount <= 0`, then the response is `400 Bad Request` with body `{errors: {amount: <non-empty string>}}` and NO row is persisted.
- **AC-3** (currency must be 3 uppercase letters, A–Z). Given an authenticated customer, when they `POST /orders` with `currency` not matching `^[A-Z]{3}$`, then the response is `400 Bad Request` with body `{errors: {currency: <non-empty string>}}` and NO row is persisted.
- **AC-4** (missing auth). Given an **un**authenticated request, when they `POST /orders`, then the response is `401 Unauthorized` regardless of body.

## Notes

- `OrdersRepository` is a TypeORM repository backed by our own Postgres — **managed** dependency.
- There is no outbound notification in this ticket; email/queue work is a separate story.
