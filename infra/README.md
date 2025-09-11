# Overview
This module of our codebase contains all of the infrastructure for our cloud platform. We are utilizing Infrastructure as Code (IaC) via Terraform for this project. This module will contain all of our Terraform code.

This section is the **Cloud Infrastructure Lead (Drew)'s** responsibility to maintain. Any significant changes to this section of the code (outside an existing task) should be reviewed by him before merging.

# Layers
Our cloud platform uses several services. To make logical sense of the services, and to give a quick idea of what services are related, they are broken up into the following layers:
- API Layer
- Data Layer
- Automation Layer
- Frontend Layer

See the headers below for a more detailed breakdown of each layer.

## API Layer
Receives data from devices and the frontend, validates it, and routes it to storage and downstream logic.

Tech used:
- **Cloudflare Workers** serverless functions
- **Cloudflare API** Routes all HTTP(S) calls

## Data Layer
Provides persistent telemetry, user preferences, and alert history.

Tech used:
- **Cloudflare D1** SQLite-based managed database
- **Drizzle ORM** Manages schema + migrations

## Automation Layer
Responsible for executing scheduled tasks.

Tech used:
- **Cloudflare Cron Triggers** Runs scheduled jobs

## Frontend Layer
Hosts the frontend. NOTE: the actual React code isn't in the frontend layer, just the hosting service.

Tech used:
- **Cloudflare Pages** Hosts React app

