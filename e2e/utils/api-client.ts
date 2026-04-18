import axios, { AxiosInstance } from "axios";

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = process.env.PLAYWRIGHT_API_URL || "http://localhost/api") {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  setToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  getToken(): string | null {
    return this.token;
  }

  async signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    pronouns: string = "they/them",
    role: string = "user"
  ) {
    return this.client.post("/auth/signup", {
      email,
      password,
      firstName,
      lastName,
      pronouns,
      role,
    });
  }

  async login(email: string, password: string) {
    return this.client.post("/auth/login", {
      email,
      password,
    });
  }

  async getCurrentUser() {
    return this.client.get("/users/me");
  }

  async createEvent(eventData: any) {
    return this.client.post("/events/new", eventData);
  }

  async getEvents() {
    return this.client.get("/events");
  }

  async getEventById(id: string) {
    return this.client.get(`/events/find/${id}`);
  }

  async updateEvent(id: string, eventData: any) {
    return this.client.put(`/events/update/${id}`, eventData);
  }

  async deleteEvent(id: string) {
    return this.client.delete(`/events/remove/${id}`);
  }

  async archiveEvent(id: string) {
    return this.client.put(`/events/archive/${id}`);
  }

  async unarchiveEvent(id: string) {
    return this.client.put(`/events/unarchive/${id}`);
  }

  async requestPasswordReset(email: string) {
    return this.client.post("/auth/forgot-password", { email });
  }

  async resetPassword(token: string, password: string) {
    return this.client.post("/auth/reset-password", { token, password });
  }

  async logOut() {
    this.token = null;
    delete this.client.defaults.headers.common["Authorization"];
  }
}

export const createApiClient = () => new ApiClient();
