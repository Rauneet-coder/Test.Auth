import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app.js";
import Usermodel from "../../src/models/user.model.js";

describe("GET /api/auth/me", () => {
    const testUser = {
        username: "metestuser",
        email: "me.test@example.com",
        password: "SecurePassword123!"
    };

    let validAccessToken;

    beforeAll(async () => {
        // Clean up & seed verified user
        await Usermodel.deleteOne({ email: testUser.email });
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        await Usermodel.create({
            username: testUser.username,
            email: testUser.email,
            password: hashedPassword,
            verified: true
        });

        // Log in to acquire a valid access token
        const loginRes = await request(app)
            .post("/api/auth/login")
            .set("User-Agent", "supertest-agent")
            .send({
                email: testUser.email,
                password: testUser.password
            });

        validAccessToken = loginRes.body.accessToken;
    });

    afterAll(async () => {
        await Usermodel.deleteOne({ email: testUser.email });
    });

    it("should return 401 if no Authorization header is provided", async () => {
        const response = await request(app).get("/api/auth/me");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized: no token provided" });
    });

    it("should return 401 if token is invalid or corrupted", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", "Bearer invalid.jwt.token");

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized: invalid or expired token" });
    });

    it("should return 200 and user profile with valid Bearer token", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${validAccessToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("user");
        expect(response.body.user.username).toBe(testUser.username);
        expect(response.body.user.email).toBe(testUser.email);
    });
});
