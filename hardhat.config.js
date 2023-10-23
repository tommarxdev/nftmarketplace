require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {},
    polygon_mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/RE3z6CzeXNZk0Y-V3YjF3hrgvUNWqfZy",
      accounts: [
        `0x${"dd792fa8bb05633277d99f660beedbe01e860a6e6b8a2d45472532753d7b85f0"}`,
      ],
    },
  },
};
