// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DiamondVipNft
 * @dev Implementation of the Diamond VIP NFT membership for the AppRank ecosystem.
 * Holders receive daily $CHESS rewards, multipliers, and free lotto entries.
 * 
 * Pricing logic:
 * - Presale: 5,000,000 $CHESS
 * - Public: 10,000,000 $CHESS
 */
contract DiamondVipNft is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    IERC20 public immutable chessToken;
    
    // Normal Price: 10,000,000 $CHESS (18 decimals)
    uint256 public constant PUBLIC_MINT_PRICE = 10_000_000 * 10**18;
    // Presale Price: 5,000,000 $CHESS (50% Discount)
    uint256 public constant PRESALE_MINT_PRICE = 5_000_000 * 10**18;
    
    bool public presaleActive = true;
    string private _baseTokenURI;

    event Minted(address indexed user, uint256 tokenId, uint256 price);
    event PresaleStatusChanged(bool active);

    /**
     * @param initialOwner Typically the deployer address (the AppRank wallet)
     * @param _chessToken The address of the $CHESS ERC20 token
     */
    constructor(address initialOwner, address _chessToken)
        ERC721("Diamond VIP", "DVIP")
        Ownable(initialOwner)
    {
        chessToken = IERC20(_chessToken);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Set the base metadata URI (IPFS link typically)
     * Should end with a slash: "ipfs://CID/"
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Mint a Diamond VIP NFT using $CHESS tokens.
     * User MUST call chessToken.approve(this_contract_address, price) first!
     */
    function mint() external {
        uint256 price = presaleActive ? PRESALE_MINT_PRICE : PUBLIC_MINT_PRICE;
        
        // Transfer $CHESS from user to the project owner
        // This clears the user's balance and funds the owner's wallet
        require(chessToken.transferFrom(msg.sender, owner(), price), "CHESS transfer failed");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        emit Minted(msg.sender, tokenId, price);
    }

    /**
     * @dev Admin-only mint for rewarding Airdrop Season top players.
     */
    function rewardMint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        emit Minted(to, tokenId, 0);
    }

    /**
     * @dev Toggle between Presale (5M) and Public (10M) price.
     */
    function setPresaleStatus(bool active) external onlyOwner {
        presaleActive = active;
        emit PresaleStatusChanged(active);
    }

    // --- Required Overrides ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, amount);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
