import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SeiDeployment", (m) => {
  // Deploy PTOKEN from the PTOKEN.sol located under contracts/ (or contracts/contracts)
  const ptoken = m.contract("PTOKEN");

  // Deploy TokenFactory with PTOKEN address
  const tokenFactory = m.contract("TokenFactory", [ptoken]);

  return { ptoken, tokenFactory };
});

