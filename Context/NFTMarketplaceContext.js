import React, { useState, useEffect, useContext } from 'react'
import web3Modal from "web3modal";
import { ethers } from "ethers";
import { useRouter } from 'next/router';
import axios from "axios";
import { create as ipfsHttpClient } from "ipfs-http-client";

//INTERNAL IMPORT
import { NFTMarketplaceAddress, NFTMarketplaceABI } from './constants';

// const client = ipfsHttpClient("http://ipfs.infura.io:5001/api/v0");

const projectId = "projectId";
const projectSecretKey = "SecrectKey";
const auth = `Basic ${Buffer.from(`${projectId}:${projectSecretKey}`).toString("base64")}`

const subdomain = "subdomain";

const client = ipfsHttpClient ({
    host: "infura-ipfs,io",
    port: "5001",
    protocol: "https",
    headers: {
        authorization: auth,
    },
});

//FETCHING SMART CONTRACT
const fetchContract = (signerOrProvider) => new ethers.Contract(
    NFTMarketplaceAddress,
    NFTMarketplaceABI,
    signerOrProvider
);

//CONNECTING WITH SMART CONTRACT
const connectingWithSmartContract = async () => {
    try {
        const web3Modal = new web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract =fetchContract(signer);
        return contract;
    } catch (error) {
        setError("Something went wrong while connecting with the contract!");
        setOpenError(true);
    }
};

export const NFTMarketplaceContext = React.createContext();

export const NFTMarketplaceProvider = ({ children }) => {
    const titleData = "Discover, collect, and sell NFTs";

    //USESTATE
    const [error, setError] = useState("");
    const [openError, setOpenError] = useState(false);
    const [currentAccount, setCurrentAccount] = useState("");
    const router = useRouter();

    //CHECK IF WALLET IS CONNECTED
    const checkIfWalletIsConnected = async () => {
        try {
            if(!window.ethereum) return setOpenError(true), setError("Please install Metamask");
                

            const accounts = await window.ethereum.request({
                method: "eth_accounts",
            });

            if(accounts.length) {
                setCurrentAccount(accounts[0]);
            } else {
                setError("No account found");
                setOpenError(true)
            }
        } catch (error) {
            setError("Something went wrong while connecting wallet");
            setOpenError(true)
        }
    };

    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

    //CONNECT WALLET
    const connectWallet = async () => {
        try {

            if(!window.ethereum) return (
               setOpenError(true), setError("Please install Metamask")
            )

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            setCurrentAccount(accounts[0]);
           // window.location.reload();

        } catch (error) {
            setError("Error while connection to wallet!");
            setOpenError(true);
        }
    };

    //UPLOAD TO IPFS
    const uploadToIPFS = async (file) => {
        try {
            const added = await client.add({ content: file })
            const url = `${subdomain}/ipfs/${added.path}`;
            return url;
        } catch (error) {
            setError("Error, upload to IPFS failed!", error);
            setOpenError(true);
        }
    };

    //CREATE NFT
    const createNFT = async (name, price, image, description, router) => {
        
            if(!name || !description || !price || !image) return setError("Data is missing"), setOpenError(true);

            const data = JSON.stringify({ name, description, image });

            try {
                const added = await client.add(data);
                const url = `https://infura-ipfs.io/ipfs/${added.path}`

                await createSale(url, price);
                router.push("/searchPage");

        } catch (error) {
            setError("Eror while creating NFT");
            setOpenError(true);
        }
    };

    //CREATE SALE
    const createSale = async (url, formInputPrice, isReselling, id) => {
        try {
            const price = ethers.utils.parseInput(formInputPrice, "ether");
            const contract = await connectingWithSmartContract();
            const listingPrice = await contract.getListingPrice();
            const transaction = !isReselling 
            ? await contract.createToken (
                url, price, {
                value: listingPrice.toString(),
        })
        : await contract.resellToken(
                id, price, {
                value: listingPrice.toString(),
            });
            await transaction.wait();
        } catch (error) {
            setError("Error iniating sale");
            setOpenError(true);
        }
    };

    //FETCH NFT'S
    const fetchNFTs = async () => {
        try {
            if(currentAccount) {
            const provider = new ethers.providers.JsonRpcProvider();
            const contract = fetchContract(provider);

            const data = await contract.fetchMarketItems();

            const items = await Promise.all(
                data.map(
                    async({tokenId, seller, owner, price: unformattedPrice}) => {
                        const tokenURI = await contract.tokenURI(tokenId);

            const {
                data: {image, name, description },
            } = await axios.get(tokenURI);

            const price = ethers.utils.formatUnits(unformattedPrice.toString(), "ether");

            return {
                price,
                tokenId: tokenId.toNumber(),
                seller,
                owner,
                image,
                name,
                description,
                tokenURI
            };
           }
          )
         );
         return items;
        }
        } catch (error) {
            setError("Error fetching NFT's");
            setOpenError(true);
        }
    };

    //FETCH MY NFT OR LISTED NFT
    const fetchMyNFTsOrListedNFTs = async (type) => {
        try {
            if(currentAccount) {
            const contract = await connectingWithSmartContract();
            const data = type == "fetchItemsListed" ? await contract.fetchItemsListed()
            : await contract.fetchMyNFT();

            const items = await Promise.all(data.map(async ({ tokenId, seller, owner, price: unformattedPrice}) => {
                const tokenURI = await contract.tokenURI(tokenId);
                const {
                    data: { image, name, description },
                } = await axios.get(tokenURI);
                const price = ethers.utils.formatUnits(unformattedPrice.toString(), "ether");

                return {
                    price,
                    tokenId: tokenId.toNumber(),
                    seller,
                    owner,
                    image,
                    name,
                    description,
                    tokenURI,
                };
            }))
            return items;
        }
        } catch (error) {
            setError("Error while fetching listed NFT's");
            setOpenError(true);
        }
    };

    useEffect(() => {
        fetchMyNFTsOrListedNFTs();
    }, []);

    //BUY NFT's
    const buyNFT = async (nft) => {
        try {
            const contract = await connectingWithSmartContract();
            const price = ethers.utils.parseUnits(nft.price.toString(), "ether");
            const transation = await contract.createMarketSale(nft.tokenId, { value: price,
            });

            await transation.wait();
            router.push("/authorPage")
        } catch (error) {
            setError("Error while buying NFT's");
            setOpenError(true);
        }

    };

    return (
        <NFTMarketplaceContext.Provider value={{ 
            checkIfWalletIsConnected,
            connectWallet,
            uploadToIPFS,
            createSale,
            createNFT,
            fetchNFTs,
            fetchMyNFTsOrListedNFTs,
            buyNFT,
            currentAccount,
            titleData,
            setOpenError,
            openError,
            error
            }}
            >
            {children}
        </NFTMarketplaceContext.Provider>
    )
};