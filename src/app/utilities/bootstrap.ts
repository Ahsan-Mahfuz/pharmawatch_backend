import config from "../config";
import { User } from "../modules/user/user.model";

export const bootstrapPharmacy = async () => {
  const existing = await User.findOne({ email: config.owner.email }).lean();
  if (existing) return;

  const count = await User.estimatedDocumentCount();
  if (count > 0) return;

  await User.create({
    name: config.owner.name,
    email: config.owner.email,
    password: config.owner.password,
    pharmacy: config.pharmacy,
    role: "owner",
  });

  console.log(`Owner account created for ${config.owner.email}`);
};
