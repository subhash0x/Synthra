import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PTOKENOnly", (m) => {
  // Deploy PTOKEN only
  const ptoken = m.contract("PTOKEN");

  return { ptoken };
});
