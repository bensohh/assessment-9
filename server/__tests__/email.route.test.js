const sgMail = require("@sendgrid/mail");

jest.mock("@sendgrid/mail", () => ({ setApiKey: jest.fn(), send: jest.fn() }));
jest.mock("../providers/helper", () => ({ isKeyMissing: jest.fn() }));

const helpers = require("../providers/helper");
const emailRouter = require("../routes/email");
const emailHandler = emailRouter.stack.find((layer) => layer.route?.path === "/github-pages").route.stack[0].handle;

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("POST /api/email/github-pages", () => {
  const originalEnvironment = { ...process.env };
  const body = {
    toEmail: "recipient@example.com", fromEmail: "sender@example.com", name: "Jane",
    email: "jane@example.com", message: "Hello",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
    helpers.isKeyMissing.mockReturnValue(false);
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it("rejects a request with a missing field", () => {
    const res = mockResponse();
    helpers.isKeyMissing.mockReturnValue("message");

    emailHandler({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "message is missing" });
    expect(sgMail.send).not.toHaveBeenCalled();
  });

  it("rejects requests without SendGrid configuration", () => {
    const res = mockResponse();
    delete process.env.SENDGRID_API_KEY;

    emailHandler({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Sendgrid API key not found" });
  });

  it("sends a templated email", async () => {
    const res = mockResponse();
    process.env.SENDGRID_API_KEY = "sendgrid-key";
    process.env.SENDGRID_TEMPLATE_ID = "template-id";
    sgMail.send.mockResolvedValue();

    emailHandler({ body }, res);
    await Promise.resolve();
    await Promise.resolve();

    expect(sgMail.setApiKey).toHaveBeenCalledWith("sendgrid-key");
    expect(sgMail.send).toHaveBeenCalledWith({
      to: "recipient@example.com", from: "sender@example.com", template_id: "template-id",
      dynamic_template_data: { name: "Jane", email: "jane@example.com", message: "Hello" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Email sent successfully" });
  });

  it("returns the email provider error", async () => {
    const res = mockResponse();
    process.env.SENDGRID_API_KEY = "sendgrid-key";
    process.env.SENDGRID_TEMPLATE_ID = "template-id";
    const error = new Error("provider unavailable");
    sgMail.send.mockRejectedValue(error);

    emailHandler({ body }, res);
    await Promise.resolve();
    await Promise.resolve();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(error);
  });
});
