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
 */
contract DiamondVipNft is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    IERC20 public immutable chessToken;
    
    uint256 public constant PUBLIC_MINT_PRICE = 10_000_000 * 10**18;
    uint256 public constant PRESALE_MINT_PRICE = 5_000_000 * 10**18;
    
    bool public presaleActive = true;
    string private _baseTokenURI;

    event Minted(address indexed user, uint256 tokenId, uint256 price);

    constructor(address initialOwner, address _chessToken)
        ERC721("Diamond VIP", "DVIP")
        Ownable(initialOwner)
    {
        chessToken = IERC20(_chessToken);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Mint a Diamond VIP NFT using $CHESS tokens.
     */
    function mint() external {
        uint256 price = presaleActive ? PRESALE_MINT_PRICE : PUBLIC_MINT_PRICE;
        
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

    function setPresaleStatus(bool active) external onlyOwner {
        presaleActive = active;
    }

    // The following functions are overrides required by Solidity.

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
