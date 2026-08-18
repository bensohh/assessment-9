const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const authController = require("../controllers/auth.controller");

jest.mock("../models/users", () => {
  const mockUser = jest.fn();
  mockUser.findOne = jest.fn();
  mockUser.find = jest.fn();
  mockUser.updateOne = jest.fn();
  return mockUser;
});

jest.mock("bcryptjs", () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ sign: jest.fn() }));

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const queryResult = (callback) => {
  const query = { exec: callback, where: jest.fn() };
  query.where.mockReturnValue(query);
  return query;
};

describe("Auth controller", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("userLogin", () => {
    const request = { body: { emailPhone: "test@example.com", password: "secret123" } };

    it("logs in a user with valid credentials", () => {
      const res = mockResponse();
      User.findOne.mockReturnValue(queryResult((callback) => callback(null, {
        _id: "abc123", fname: "Jane", lname: "Doe", email: "test@example.com",
        isAdmin: false, password: "hashed-password",
      })));
      bcrypt.compare.mockImplementation((password, hash, callback) => callback(null, true));
      jwt.sign.mockReturnValue("signed-token");

      authController.userLogin(request, res);

      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith("secret123", "hashed-password", expect.any(Function));
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ _id: "abc123" }) }),
        expect.any(String),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Login Successful", token: "signed-token" });
    });

    it("rejects an unknown user", () => {
      const res = mockResponse();
      User.findOne.mockReturnValue(queryResult((callback) => callback(null, null)));

      authController.userLogin(request, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid Credentials2" });
    });

    it("rejects an invalid password", () => {
      const res = mockResponse();
      User.findOne.mockReturnValue(queryResult((callback) => callback(null, { password: "hashed-password" })));
      bcrypt.compare.mockImplementation((password, hash, callback) => callback(null, false));

      authController.userLogin(request, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid Credentials1" });
    });

    it("returns 400 without credentials and does not query the database", () => {
      const res = mockResponse();

      authController.userLogin({ body: {} }, res);

      expect(User.findOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Provide all Credentials" });
    });

    it("returns a database error", () => {
      const res = mockResponse();
      const error = new Error("database unavailable");
      User.findOne.mockReturnValue(queryResult((callback) => callback(error)));

      authController.userLogin(request, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(error);
    });
  });

  describe("userRegistration", () => {
    const request = { body: {
      fname: "Jane", lName: "Doe", email: "jane@example.com", phoneNo: "9999999999",
      state: "state-1", city: "city-1", pincode: "110001", user_type: 2, password: "secret123",
    } };

    it("hashes the password, saves the user, and returns its id", () => {
      const res = mockResponse();
      const user = { save: jest.fn((callback) => callback(null, { _id: "new-user-id" })) };
      User.mockImplementation(() => user);
      bcrypt.hash.mockImplementation((password, rounds, callback) => callback(null, "hashed-password"));

      authController.userRegistration(request, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("secret123", 10, expect.any(Function));
      expect(user).toMatchObject({ fname: "Jane", lname: "Doe", email: "jane@example.com", password: "hashed-password" });
      expect(user.save).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "User Added Successfully", id: "new-user-id" });
    });

    it("returns a hash error without saving", () => {
      const res = mockResponse();
      const user = { save: jest.fn() };
      const error = new Error("hash failed");
      User.mockImplementation(() => user);
      bcrypt.hash.mockImplementation((password, rounds, callback) => callback(error));

      authController.userRegistration(request, res);

      expect(user.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(error);
    });
  });

  describe("changePass", () => {
    it("updates the password after hashing it", () => {
      const res = mockResponse();
      User.findOne.mockReturnValue(queryResult((callback) => callback(null, { _id: "user-1" })));
      bcrypt.hash.mockImplementation((password, rounds, callback) => callback(null, "new-hash"));
      User.updateOne.mockReturnValue(queryResult((callback) => callback(null, { modifiedCount: 1 })));

      authController.changePass({ body: { _id: "user-1", password: "new-password" } }, res);

      expect(User.updateOne).toHaveBeenCalledWith({ _id: "user-1" }, { password: "new-hash" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password Changed Successfully", id: { modifiedCount: 1 },
      });
    });

    it("returns an update error", () => {
      const res = mockResponse();
      const error = new Error("update failed");
      User.findOne.mockReturnValue(queryResult((callback) => callback(null, { _id: "user-1" })));
      bcrypt.hash.mockImplementation((password, rounds, callback) => callback(null, "new-hash"));
      User.updateOne.mockReturnValue(queryResult((callback) => callback(error)));

      authController.changePass({ body: { _id: "user-1", password: "new-password" } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Something Went Wrong", data: error });
    });
  });

  describe("userList", () => {
    it("returns all users", () => {
      const res = mockResponse();
      const users = [{ _id: "user-1" }];
      User.find.mockReturnValue(queryResult((callback) => callback(null, users)));

      authController.userList({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Success", data: users });
    });
  });
});
