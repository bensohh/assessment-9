const helpers = require("../providers/helper");
const PropertyType = require("../models/propertyTypes");
const Property = require("../models/property");
const propertyController = require("../controllers/property.controller");

jest.mock("mongoose", () => ({ connection: { on: jest.fn() }, mongo: {} }));
jest.mock("gridfs-stream", () => jest.fn());
jest.mock("../providers/helper", () => ({ slugGenerator: jest.fn() }));
jest.mock("../models/propertyTypes", () => {
  const Model = jest.fn();
  Model.find = jest.fn();
  return Model;
});
jest.mock("../models/property", () => {
  const Model = jest.fn();
  Model.find = jest.fn();
  Model.findOne = jest.fn();
  Model.update = jest.fn();
  return Model;
});

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
const promiseQuery = (value) => {
  const query = { populate: jest.fn(), then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  query.populate.mockReturnValue(query);
  return query;
};

describe("Property controller", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists active property types", () => {
    const res = mockResponse();
    const types = [{ title: "Apartment" }];
    PropertyType.find.mockImplementation((query, callback) => callback(null, types));

    propertyController.propertyTypeList({}, res);

    expect(PropertyType.find).toHaveBeenCalledWith({ is_active: true }, expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(types);
  });

  it("creates a property type", () => {
    const res = mockResponse();
    const type = { save: jest.fn((callback) => callback(null, { _id: "type-1" })) };
    PropertyType.mockImplementation(() => type);

    propertyController.addPropertyType({ body: { title: "Apartment", type: "residential" } }, res);

    expect(type).toMatchObject({ title: "Apartment", type: "residential" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Property type added successfully", id: "type-1" });
  });

  it("creates a property with generated metadata and image names", async () => {
    const res = mockResponse();
    const request = { body: { title: "Test home", Proptype: "type-1", isSociety: false }, files: [{ filename: "one.jpg" }] };
    const property = { save: jest.fn().mockResolvedValue({ _id: "property-1", slug: "test-home" }) };
    Property.mockImplementation(() => property);
    helpers.slugGenerator.mockResolvedValue("test-home");

    await propertyController.addNewProperty(request, res);

    expect(helpers.slugGenerator).toHaveBeenCalledWith("Test home", "title", "property");
    expect(request.body).toMatchObject({
      slug: "test-home", type: "type-1", images: ["one.jpg"], imgPath: "properties",
      flatNo: "", societyName: "",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Your property has been successfully posted" }));
  });

  it("returns an error when property creation fails", async () => {
    const res = mockResponse();
    helpers.slugGenerator.mockRejectedValue(new Error("slug failed"));

    await propertyController.addNewProperty({ body: { title: "Test home" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "slug failed" });
  });

  it("lists a user's active properties", () => {
    const res = mockResponse();
    const properties = [{ _id: "property-1" }];
    Property.find.mockReturnValue(queryResult((callback) => callback(null, properties)));

    propertyController.getUserList({ params: { userId: "user-1" } }, res);

    expect(Property.find).toHaveBeenCalledWith({ isActive: true, userId: "user-1" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(properties);
  });

  it("lists all active properties", () => {
    const res = mockResponse();
    const properties = [{ _id: "property-1" }];
    Property.find.mockReturnValue(queryResult((callback) => callback(null, properties)));

    propertyController.getFullList({}, res);

    expect(Property.find).toHaveBeenCalledWith({ isActive: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(properties);
  });

  it("returns a property without GridFS lookups when it has no images", async () => {
    const res = mockResponse();
    const property = { _id: "property-1", images: [] };
    Property.findOne.mockReturnValue(promiseQuery(property));

    await propertyController.getSingleProperty({ params: { propertySlug: "test-home" } }, res);

    expect(Property.findOne).toHaveBeenCalledWith({ slug: "test-home" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: property, files: [] });
  });

  it("marks a property as sold using Mongoose's current update result", async () => {
    const res = mockResponse();
    const result = { modifiedCount: 1 };
    Property.update.mockResolvedValue(result);

    await propertyController.markAsSold({ params: { propertySlug: "test-home" }, body: { status: "sold" } }, res);

    expect(Property.update).toHaveBeenCalledWith({ slug: "test-home" }, { status: "sold" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result, message: "Property has been updated Successfully" });
  });

  it("builds filters from supported query parameters", () => {
    const res = mockResponse();
    Property.find.mockReturnValue(queryResult((callback) => callback(null, [])));

    propertyController.filterProperties({ query: { propertyFor: "sale,rent", city: "city-1", status: "active" } }, res);

    expect(Property.find).toHaveBeenCalledWith({
      propertyFor: { $in: ["sale", "rent"] }, city: { $in: ["city-1"] }, status: { $in: ["active"] },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
