import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const CHESS_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";

    const DiamondVipNft = await ethers.getContractFactory("DiamondVipNft");
    const diamondVip = await DiamondVipNft.deploy(deployer.address, CHESS_TOKEN_ADDRESS);

    await diamondVip.waitForDeployment();

    console.log("DiamondVipNft deployed to:", await diamondVip.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
