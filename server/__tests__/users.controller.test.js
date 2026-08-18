const User = require("../models/users");
const usersController = require("../controllers/users.controller");

jest.mock("../models/users", () => ({ findOne: jest.fn() }));

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const queryResult = (callback) => {
  const query = { exec: callback, populate: jest.fn() };
  query.populate.mockReturnValue(query);
  return query;
};

describe("Users controller", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns a user's populated details", () => {
    const res = mockResponse();
    const user = { _id: "user-1", fname: "Jane" };
    User.findOne.mockReturnValue(queryResult((callback) => callback(null, user)));

    usersController.getUserDetails({ params: { userId: "user-1" } }, res);

    expect(User.findOne).toHaveBeenCalledWith({ _id: "user-1" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(user);
  });

  it("returns a lookup error", () => {
    const res = mockResponse();
    const error = new Error("user lookup failed");
    User.findOne.mockReturnValue(queryResult((callback) => callback(error)));

    usersController.getUserDetails({ params: { userId: "user-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(error);
  });
});
