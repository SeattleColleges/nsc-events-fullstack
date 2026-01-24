--
-- PostgreSQL database dump
--

-- Dumped from database version 16.1
-- Dumped by pg_dump version 16.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "PK_a3ffb1c0c8416b9fc6f907b7433";
ALTER TABLE IF EXISTS ONLY public.event_registrations DROP CONSTRAINT IF EXISTS "PK_953d3b862c2487289a92b2356e9";
ALTER TABLE IF EXISTS ONLY public.activities DROP CONSTRAINT IF EXISTS "PK_7f4004429f731ffb9c88eb486a8";
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.event_registrations;
DROP TABLE IF EXISTS public.activities;
DROP TYPE IF EXISTS public.users_role_enum;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'admin',
    'creator',
    'user'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_by_user_id character varying,
    "eventTitle" character varying NOT NULL,
    "eventDescription" text NOT NULL,
    "startDate" timestamp with time zone NOT NULL,
    "endDate" timestamp with time zone NOT NULL,
    "eventLocation" character varying NOT NULL,
    "eventCoverPhoto" character varying DEFAULT ''::character varying NOT NULL,
    "eventDocument" character varying DEFAULT ''::character varying NOT NULL,
    "eventHost" character varying NOT NULL,
    "eventMeetingURL" character varying,
    "eventRegistration" character varying,
    "eventCapacity" character varying NOT NULL,
    "eventTags" text NOT NULL,
    "eventSchedule" character varying,
    "eventSpeakers" text,
    "eventPrerequisites" character varying,
    "eventCancellationPolicy" character varying,
    "eventContact" character varying NOT NULL,
    "eventSocialMedia" json DEFAULT '{}'::json NOT NULL,
    "attendanceCount" integer DEFAULT 0 NOT NULL,
    attendees json,
    "eventPrivacy" character varying,
    "eventAccessibility" character varying,
    "eventNote" character varying,
    "isHidden" boolean DEFAULT false NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_registrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    activity_id character varying NOT NULL,
    user_id character varying NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    email character varying NOT NULL,
    college character varying NOT NULL,
    "yearOfStudy" character varying NOT NULL,
    "isAttended" boolean NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_registrations OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    pronouns character varying NOT NULL,
    email character varying NOT NULL,
    password character varying,
    role public.users_role_enum DEFAULT 'user'::public.users_role_enum NOT NULL,
    "googleCredentials" json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "resetPasswordToken" character varying,
    "resetPasswordExpires" timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, created_by_user_id, "eventTitle", "eventDescription", "startDate", "endDate", "eventLocation", "eventCoverPhoto", "eventDocument", "eventHost", "eventMeetingURL", "eventRegistration", "eventCapacity", "eventTags", "eventSchedule", "eventSpeakers", "eventPrerequisites", "eventCancellationPolicy", "eventContact", "eventSocialMedia", "attendanceCount", attendees, "eventPrivacy", "eventAccessibility", "eventNote", "isHidden", "isArchived", "createdAt", "updatedAt") FROM stdin;
693e4d8a-a007-4f93-a636-0696485b82d0	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 5	test	2025-12-30 10:00:00-08	2025-12-30 11:00:00-08	south seattle college			ssc			10	Tech,Cultural					contact@ssc.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 13:55:49.506427-08	2025-12-06 23:35:36.161302-08
a9735b22-228c-4c1a-b045-81f37f77a8f0	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 7	test	2025-12-19 10:00:00-08	2025-12-19 11:00:00-08	Bellevue			Bellevue college			10	Tech,Cultural					contact@bellevue.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 13:50:10.472591-08	2025-11-29 13:50:10.472591-08
2f5db7c9-4f4a-46d9-9710-6f562bc0fb2e	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 8	test	2026-01-06 10:00:00-08	2026-01-06 11:00:00-08	Seattle			nsc			10	Tech,Social					contact@nsc.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 13:51:25.35471-08	2025-11-29 13:51:25.35471-08
53d75087-7e2b-4c91-919d-68d19f979d11	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 9	test	2026-02-04 10:00:00-08	2026-02-04 11:00:00-08	south seattle college			ssc			10	Club,Coffee					contact@south.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 13:53:10.839681-08	2025-11-29 13:53:10.839681-08
e8d62159-0ce5-4c74-a267-b3b4f245cd7d	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 1	test event	2025-12-10 10:00:00-08	2025-12-10 11:00:00-08	Seattle			NSC			10	Social,Tech					contact@nsc.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 12:08:59.11482-08	2025-12-06 23:55:04.936443-08
5863e64f-485d-45b3-979c-89acc6176901	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	test10	test event	2025-12-11 10:00:00-08	2025-12-11 11:00:00-08	seattle			test host			10	Club,Social					contact@event.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-12-07 01:36:42.43298-08	2025-12-07 01:36:42.43298-08
7a16f6a4-bffe-48b6-a1e5-9496ff91c4d9	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test Event 4	test event 1	2025-12-04 10:00:00-08	2025-12-04 11:00:00-08	Bellevue			Bellevue college -b			10	Tech,Social					contact@bellevue.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 13:47:41.136697-08	2025-12-07 13:52:52.057015-08
ca0bf3a6-9dc5-435b-8153-ace31d7a4cc4	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 2	test	2025-12-10 10:00:00-08	2025-12-10 11:00:00-08	Seattle			NSC			10	Study,Coffee,Art/Creative					contact@nsc.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-18 23:25:38.046548-08	2025-11-29 14:08:04.176781-08
38d5246a-265d-41ca-8d38-ba3da66360e5	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 3	test	2025-12-15 10:00:00-08	2025-12-15 11:00:00-08	Seattle			nsc			10	Networking,Free Food					contact@nsc.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	f	2025-11-29 13:46:22.19262-08	2025-12-02 11:43:21.941409-08
8518c961-3801-401a-9273-f54fdb9c1e7b	e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Test event 6	test 1	2025-12-09 10:00:00-08	2025-12-09 11:00:00-08	Bellevue			Bellevue college			10	Cultural,Club					contact@bellevue.com	{"facebook":"","twitter":"","instagram":"","hashtag":""}	0	\N				f	t	2025-11-29 13:49:00.951706-08	2025-12-07 13:25:42.453924-08
\.


--
-- Data for Name: event_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_registrations (id, activity_id, user_id, "firstName", "lastName", email, college, "yearOfStudy", "isAttended", "createdAt", "updatedAt") FROM stdin;
5f451fca-4f41-4aa4-84da-ea1dacd37975	8518c961-3801-401a-9273-f54fdb9c1e7b	a1ae4d20-10d2-4589-b789-d0ed9029e8f3	nah	a				t	2025-12-07 01:27:02.941903	2025-12-07 01:27:02.941903
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, "firstName", "lastName", pronouns, email, password, role, "googleCredentials", "createdAt", "updatedAt", "resetPasswordToken", "resetPasswordExpires") FROM stdin;
e7745098-fd54-44cb-9141-7e9c1bfdeb7c	Admin	d	he/him	admin@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2025-10-14 10:53:47.21114	2025-10-14 10:53:47.21114	\N	\N
a545a3b5-a422-4b8e-ad79-c24778bb0fa3	creator	d	he	creator@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	creator	\N	2025-10-16 11:12:23.634575	2025-10-16 11:12:23.634575	\N	\N
6d2aaad3-5b80-4913-bc90-2061c35b81c4	admins	swagger	he	adminswagger@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2025-11-16 12:36:44.569308	2025-11-16 12:36:44.569308	\N	\N
cddb60ff-25bc-4b3c-96ee-56fa1fb56c8d	swagger	test	he	swagger@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2025-11-16 12:56:28.53978	2025-11-16 12:56:28.53978	\N	\N
cc653869-5056-4cce-81a4-3e5887683b6e	John	Doe	he/him	john.doe@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2025-11-18 12:44:52.340794	2025-11-18 12:44:52.340794	\N	\N
70092e3b-3421-4fe3-875a-1cb4d5e2bb79	Sam	Doe	he/him	sam.doe@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	user	\N	2025-11-18 12:55:41.491337	2025-11-18 12:55:41.491337	\N	\N
07f5fe42-0f7f-4bab-a443-26ad1678ea81	Sam	smith	he/him	sam.smith@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2025-11-18 12:57:30.51151	2025-11-18 12:57:30.51151	\N	\N
b403bd04-7821-401e-a808-70f47d2349c0	nahom	Doe	he/him	nahom@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2026-01-12 11:44:23.154689	2026-01-12 11:44:23.154689	\N	\N
5781618e-88e2-4dd3-9614-6eb2c7aa6fe9	nah	alemu	he/him	nahom2@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2026-01-12 12:05:04.759169	2026-01-12 12:05:04.759169	\N	\N
509d8c03-4e01-43fe-8b79-5ae4b7eb75b7	Sam	Doe	he/him	sam1@example.com	$2b$12$VLWWjrpqjeaJDkeeJouxHujKRuZ2QkhU5Ar8Jxh.5f/fubDLVbuSW	admin	\N	2026-01-12 12:18:27.556527	2026-01-12 12:18:27.556527	\N	\N
\.


--
-- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);


--
-- Name: event_registrations PK_953d3b862c2487289a92b2356e9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT "PK_953d3b862c2487289a92b2356e9" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- PostgreSQL database dump complete
--

