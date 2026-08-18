const State = require("../models/state");
const City = require("../models/city");
const User = require("../models/users");
const commonController = require("../controllers/common.controller");

jest.mock("../models/state", () => {
  const Model = jest.fn();
  Model.find = jest.fn();
  return Model;
});
jest.mock("../models/city", () => {
  const Model = jest.fn();
  Model.find = jest.fn();
  Model.remove = jest.fn();
  return Model;
});
jest.mock("../models/users", () => ({ find: jest.fn() }));

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const queryResult = (callback) => {
  const query = { exec: callback, populate: jest.fn() };
  query.populate.mockReturnValue(query);
  return query;
};

describe("Common controller", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists active states", () => {
    const res = mockResponse();
    const states = [{ name: "Delhi" }];
    State.find.mockReturnValue(queryResult((callback) => callback(null, states)));

    commonController.getStateList({}, res);

    expect(State.find).toHaveBeenCalledWith({ is_active: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(states);
  });

  it("returns a state lookup error only once", () => {
    const res = mockResponse();
    const error = new Error("state lookup failed");
    State.find.mockReturnValue(queryResult((callback) => callback(error)));

    commonController.getStateList({}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it("creates a state", () => {
    const res = mockResponse();
    const state = { save: jest.fn((callback) => callback(null)) };
    State.mockImplementation(() => state);

    commonController.addState({ body: { name: "Delhi" } }, res);

    expect(state.name).toBe("Delhi");
    expect(res.json).toHaveBeenCalledWith({ message: "State added successfully" });
  });

  it("lists and filters active cities", () => {
    const res = mockResponse();
    const cities = [{ name: "New Delhi" }];
    City.find.mockReturnValue(queryResult((callback) => callback(null, cities)));

    commonController.getCityList({ params: { state_id: "state-1" } }, res);

    expect(City.find).toHaveBeenCalledWith({ state_id: "state-1", is_active: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(cities);
  });

  it("creates a city and reports persistence failures", async () => {
    const res = mockResponse();
    City.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: "city-1" }) }));

    await commonController.addCity({ body: { name: "New Delhi" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "City added successfully" });
  });

  it("removes a city", () => {
    const res = mockResponse();
    const result = { deletedCount: 1 };
    City.remove.mockImplementation((query, callback) => callback(null, result));

    commonController.removeCity({ params: { cityId: "city-1" } }, res);

    expect(City.remove).toHaveBeenCalledWith({ _id: "city-1" }, expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "City removed successfully", data: result });
  });

  it("checks email availability", () => {
    const res = mockResponse();
    User.find.mockImplementation((query, callback) => callback(null, [{ _id: "user-1" }]));

    commonController.checkemailAvailability({ params: { email: "test@example.com" } }, res);

    expect(User.find).toHaveBeenCalledWith({ email: "test@example.com" }, expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({ response: true });
  });
});
