# MySQL Migration & Dockerization: Summary of Changes

This document outlines the major repository changes made to migrate the `nsc-events-fullstack` application to a MySQL database and containerize it using Docker.

---

## 1. Docker Configuration Creation

The following `Dockerfile` and `compose.yaml` files were created to define the application's services, environment, and build process.

### `Dockerfile`

This file defines the multi-stage build process for the frontend and backend services. It ensures all source code is copied at build time to create self-contained, stable images.

### `compose.yaml`

This file orchestrates the different services of the application: `proxy` (Traefik for routing), `backend` (NestJS API), `client` (Next.js frontend), `mysql` (database), and `phpmyadmin` (database GUI). It defines their build instructions, environment variables, dependencies, and networking.mysql

---

## 2. Backend Code Modifications for MySQL

- **`nsc-events-nestjs/package.json` Modifications:**
  - **Database Driver:** Removed the `pg` (PostgreSQL) dependency and added `mysql2: ^3.6.5` (MySQL) to the `dependencies`.

- **`nsc-events-nestjs/src/app.module.ts` Modifications:**
  - **TypeORM Configuration:** Changed `type: 'postgres'` to `type: 'mysql'` in `TypeOrmModule.forRootAsync`.
  - **Environment Variable Mapping:** Updated `configService.get` calls to read `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DB` instead of their PostgreSQL counterparts.

- **`nsc-events-nestjs/src/activity/entities/activity.entity.ts` Modifications:**
  - **Timestamp Data Types:** Changed `timestamptz` (PostgreSQL-specific) to `datetime` for `startDate` and `endDate` columns.
  - **Timestamp Data Types (Auto-inferred):** Removed explicit `type: 'timestamp'` from `@CreateDateColumn` and `@UpdateDateColumn` to allow TypeORM to infer the correct MySQL types.
  - **JSON Column Default:** Removed `default: {}` from the `eventSocialMedia` column, as this is not valid SQL syntax for default values on JSON types in MySQL.
