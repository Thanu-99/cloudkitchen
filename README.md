# CloudBites — Azure Observability Stack

CloudBites is a cloud-kitchen application developed as part of a Microsoft Azure hackathon. The project combines food-order management with application monitoring using Azure's managed observability services.

## Problem Statement

**Azure Managed Grafana and Prometheus Observability Stack**

Applications need monitoring to understand their performance, track important metrics, and identify potential issues. This project explores how Prometheus and Azure Managed Grafana can be used with Azure Monitor to collect and visualize application metrics.

## Tech Stack

- **Frontend:** React, Vite, TypeScript
- **Backend:** Node.js, Express
- **Metrics:** Prometheus (`prom-client`)
- **Monitoring:** Azure Monitor Managed Service for Prometheus
- **Dashboards:** Azure Managed Grafana

## Features

- Food-ordering interface and order management
- Backend API for handling orders
- Prometheus-compatible application metrics exposed through a `/metrics` endpoint
- Azure-based metrics monitoring and visualization
- Dashboards for reviewing application and system health

## Project Context

Developed collaboratively for a Microsoft Azure hackathon focused on cloud observability and monitoring.

## Repository Structure

- `frontend/` — Frontend application
- `CloudBites-Backend/` — Backend application
- `README.md` — Project overview and technology stack
