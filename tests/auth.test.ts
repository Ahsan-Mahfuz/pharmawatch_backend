import assert from "assert";
import { expectError, memoryDatabase, report, test } from "./harness";
import { OWNER, PHARMACIST } from "./fixtures";

const run = async () => {
  const stop = await memoryDatabase();

  const { User } = await import("../src/app/modules/user/user.model");
  const { AuthService } = await import("../src/app/modules/auth/auth.service");
  const { verifyAccessToken, verifyRefreshToken } = await import("../src/app/utilities/token");
  const { hashToken } = await import("../src/app/utilities/hash");

  let session = await AuthService.register(OWNER);

  await test("the first account to register owns the pharmacy", () => {
    assert.equal(session.account.role, "owner");
    assert.equal(session.account.pharmacy, OWNER.pharmacy);
  });

  await test("everyone added afterwards is a pharmacist", async () => {
    const staff = await AuthService.addStaff(OWNER.pharmacy, PHARMACIST);
    assert.equal(staff.role, "pharmacist");
  });

  await test("the password is stored hashed, never in the clear", async () => {
    const raw = await User.findOne({ email: OWNER.email }).select("+password").lean();
    assert.ok(raw?.password);
    assert.notEqual(raw?.password, OWNER.password);
    assert.ok(raw!.password.startsWith("$2"));
  });

  await test("the password never comes back in a plain query", async () => {
    const user = await User.findOne({ email: OWNER.email }).lean();
    assert.equal(user?.password, undefined);
  });

  await test("the same email cannot be registered twice", async () => {
    await expectError(() => AuthService.register(OWNER), "already uses this email");
  });

  await test("signing in returns both tokens and the account", async () => {
    session = await AuthService.login({ email: OWNER.email, password: OWNER.password });
    assert.ok(session.accessToken);
    assert.ok(session.refreshToken);
    assert.equal(session.account.email, OWNER.email);
  });

  await test("the access token carries the role, not just the id", () => {
    const payload = verifyAccessToken(session.accessToken);
    assert.equal(payload.role, "owner");
    assert.equal(payload.email, OWNER.email);
  });

  await test("a wrong password is refused", async () => {
    await expectError(
      () => AuthService.login({ email: OWNER.email, password: "NotTheOne1" }),
      "do not match",
    );
  });

  await test("an unknown email is refused with the very same message", async () => {
    await expectError(
      () => AuthService.login({ email: "nobody@nowhere.test", password: "NotTheOne1" }),
      "do not match",
    );
  });

  await test("a deactivated account cannot sign in", async () => {
    await User.updateOne({ email: PHARMACIST.email }, { isActive: false });
    await expectError(
      () => AuthService.login({ email: PHARMACIST.email, password: PHARMACIST.password }),
      "do not match",
    );
    await User.updateOne({ email: PHARMACIST.email }, { isActive: true });
  });

  await test("a refresh token mints a new session", async () => {
    const next = await AuthService.refresh(session.refreshToken);
    assert.equal(next.account.email, OWNER.email);
    assert.equal(verifyRefreshToken(next.refreshToken).userId, session.account.id);
  });

  await test("an access token is not accepted as a refresh token", async () => {
    await expectError(() => AuthService.refresh(session.accessToken), "expired");
  });

  await test("forgot-password answers the same for a known and an unknown address", async () => {
    const known = await AuthService.forgotPassword({ email: OWNER.email });
    const unknown = await AuthService.forgotPassword({ email: "nobody@nowhere.test" });
    assert.equal(known.sent, true);
    assert.equal(unknown.sent, true);
    assert.equal(known.message, unknown.message);
  });

  await test("only a hash of the reset token is stored", async () => {
    const issued = await AuthService.forgotPassword({ email: OWNER.email });
    const stored = await User.findOne({ email: OWNER.email }).select("+resetTokenHash").lean();
    assert.ok(issued.devToken);
    assert.notEqual(stored?.resetTokenHash, issued.devToken);
    assert.equal(stored?.resetTokenHash, hashToken(issued.devToken!));
  });

  let usedToken = "";

  await test("a reset link sets the new password", async () => {
    const issued = await AuthService.forgotPassword({ email: OWNER.email });
    usedToken = issued.devToken!;

    const result = await AuthService.resetPassword({
      token: usedToken,
      password: "Zindabazar2027",
    });
    assert.equal(result.ok, true);

    const next = await AuthService.login({ email: OWNER.email, password: "Zindabazar2027" });
    assert.equal(next.account.email, OWNER.email);
  });

  await test("a reset link works exactly once", async () => {
    await expectError(
      () => AuthService.resetPassword({ token: usedToken, password: "Something3Else" }),
      "expired",
    );
  });

  await test("changing the password revokes every existing session", async () => {
    const before = await AuthService.login({ email: OWNER.email, password: "Zindabazar2027" });
    await AuthService.changePassword(before.account.id, {
      currentPassword: "Zindabazar2027",
      password: "Boundary2028",
    });
    await expectError(() => AuthService.refresh(before.refreshToken), "expired");
  });

  await test("changing the password needs the current one", async () => {
    const current = await AuthService.login({ email: OWNER.email, password: "Boundary2028" });
    await expectError(
      () =>
        AuthService.changePassword(current.account.id, {
          currentPassword: "WrongOne123",
          password: "Another2029",
        }),
      "not right",
    );
  });

  await stop();
  report("auth");
};

void run();
