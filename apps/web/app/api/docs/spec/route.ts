import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.0",
  info: {
    title: "DailyMed API",
    version: "1.0.0",
    description: "Sistema colaborativo de controle de aplicação de medicação",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"], summary: "Register a new user", security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 } } } } } },
        responses: { "201": { description: "User created with JWT tokens" }, "400": { description: "Validation error or email in use" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Login", security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" } } } } } },
        responses: { "200": { description: "JWT tokens returned" }, "401": { description: "Invalid credentials" } },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"], summary: "Refresh access token", security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } } } },
        responses: { "200": { description: "New tokens returned" }, "401": { description: "Invalid refresh token" } },
      },
    },
    "/groups": {
      get: { tags: ["Groups"], summary: "List user groups", responses: { "200": { description: "Groups list" } } },
      post: { tags: ["Groups"], summary: "Create group", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } }, responses: { "201": { description: "Group created with invite_code" } } },
    },
    "/groups/join": {
      post: { tags: ["Groups"], summary: "Join group via invite code", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["invite_code"], properties: { invite_code: { type: "string" } } } } } }, responses: { "200": { description: "Joined group" } } },
    },
    "/groups/{id}": {
      get: { tags: ["Groups"], summary: "Get group details", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Group details" } } },
      patch: { tags: ["Groups"], summary: "Update group name (admin)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } }, responses: { "200": { description: "Updated" } } },
    },
    "/groups/{id}/members": {
      get: { tags: ["Groups"], summary: "List members", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Members" } } },
    },
    "/groups/{id}/members/{userId}": {
      delete: { tags: ["Groups"], summary: "Remove member (admin)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "userId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Removed" } } },
    },
    "/groups/{id}/invite/regenerate": {
      post: { tags: ["Groups"], summary: "Regenerate invite code (admin)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "New invite code" } } },
    },
    "/patients": {
      get: { tags: ["Patients"], summary: "List patients", parameters: [{ name: "group_id", in: "query", schema: { type: "string" } }], responses: { "200": { description: "List" } } },
      post: { tags: ["Patients"], summary: "Create patient", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["group_id", "name", "species"], properties: { group_id: { type: "string" }, name: { type: "string" }, species: { type: "string" }, breed: { type: "string" }, birth_date: { type: "string" }, weight_kg: { type: "number" }, photo_url: { type: "string" }, notes: { type: "string" } } } } } }, responses: { "201": { description: "Created" } } },
    },
    "/patients/{id}": {
      get: { tags: ["Patients"], summary: "Get patient", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Patient" } } },
      patch: { tags: ["Patients"], summary: "Update patient", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Patients"], summary: "Archive patient", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Archived" } } },
    },
    "/medications": {
      get: { tags: ["Medications"], summary: "List medications", parameters: [{ name: "group_id", in: "query", schema: { type: "string" } }], responses: { "200": { description: "List" } } },
      post: { tags: ["Medications"], summary: "Create medication", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["group_id", "name", "dose_unit"], properties: { group_id: { type: "string" }, name: { type: "string" }, manufacturer: { type: "string" }, active_ingredient: { type: "string" }, application_method: { type: "string", enum: ["oral", "injectable", "topical", "ophthalmic", "otic", "inhalation", "other"] }, dose_unit: { type: "string" }, stock_quantity: { type: "number" } } } } } }, responses: { "201": { description: "Created" } } },
    },
    "/medications/{id}": {
      get: { tags: ["Medications"], summary: "Get medication", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Medication" } } },
      patch: { tags: ["Medications"], summary: "Update medication (incl. stock)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Medications"], summary: "Delete medication", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/prescriptions": {
      get: { tags: ["Prescriptions"], summary: "List prescriptions", parameters: [{ name: "patient_id", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string", enum: ["active", "paused", "finished"] } }], responses: { "200": { description: "List" } } },
      post: { tags: ["Prescriptions"], summary: "Create prescription — returns suggested_times", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["patient_id", "medication_id", "dose_quantity", "dose_unit", "frequency_hours"], properties: { patient_id: { type: "string" }, medication_id: { type: "string" }, dose_quantity: { type: "number" }, dose_fraction: { type: "string", example: "1/4" }, dose_unit: { type: "string" }, frequency_hours: { type: "number" }, duration_days: { type: "integer" }, start_date: { type: "string", format: "date" } } } } } }, responses: { "201": { description: "Created with suggestedTimes" } } },
    },
    "/prescriptions/{id}": {
      get: { tags: ["Prescriptions"], summary: "Get prescription", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Prescription" } } },
      patch: { tags: ["Prescriptions"], summary: "Update — confirm schedule_times or change status", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { schedule_times: { type: "array", items: { type: "string" } }, status: { type: "string", enum: ["active", "paused", "finished"] } } } } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Prescriptions"], summary: "Delete prescription", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/applications": {
      get: { tags: ["Applications"], summary: "List applications", parameters: [{ name: "prescription_id", in: "query", schema: { type: "string" } }, { name: "date", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "List" } } },
      post: { tags: ["Applications"], summary: "Register application — decrements stock", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["prescription_id", "applied_at", "dose_applied"], properties: { prescription_id: { type: "string" }, applied_at: { type: "string", format: "date-time" }, scheduled_at: { type: "string", format: "date-time" }, dose_applied: { type: "number" }, notes: { type: "string" } } } } } }, responses: { "201": { description: "Registered with stock_remaining" } } },
    },
    "/applications/{id}": {
      get: { tags: ["Applications"], summary: "Get application", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Application" } } },
      patch: { tags: ["Applications"], summary: "Correct application", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Applications"], summary: "Delete application", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/dashboard/pending": {
      get: { tags: ["Dashboard"], summary: "Pending medications today — sorted overdue first", responses: { "200": { description: "Items with status: overdue | upcoming | applied" } } },
    },
    "/dashboard/stock": {
      get: { tags: ["Dashboard"], summary: "Stock projection — alert when < 7 days remaining", responses: { "200": { description: "Medications with days_remaining and alert flag" } } },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
