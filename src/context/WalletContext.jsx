import { createContext, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  // States
  const [address, setAddress] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chainId, setChainId] = useState(null);

  // ---------------- Utility/Helper Methods ---------------- //

  /**
   * Formats the wallet address to display first & last 4 digits
   */
  const formatWalletAddress = (addr) => {
    if (!addr) {
      return "";
    }

    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  /**
   * Checks if metamask is installed
   */
  const metaMaskInstallationCheck = () => {
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      return true;
    } else {
      return false;
    }
  };

  // ---------------- Wallet Methods ---------------- //

  /**
   * Attempts to connect to metamask
   */
  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!metaMaskInstallationCheck()) {
        throw new Error(
          "MetaMask not installed. Please install MetaMask to continue.",
        );
      }

      const ethereum = window.ethereum;

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const userAddress = accounts[0];
        setAddress(userAddress);
        setConnected(true);

        const currChainIdHex = await ethereum.request({
          method: "eth_chainId",
        });
        setChainId(parseInt(currChainIdHex, 16));

        localStorage.setItem("walletAddress", userAddress);
        localStorage.setItem("connected", "true");
      }
    } catch (err) {
      let errorMessage = "Failed to connect to wallet, please try again later.";
      if (err.code === 4001) {
        errorMessage = "User rejected wallet connection request";
      } else if (err.code === 4100) {
        errorMessage = "Requested account or method not authorized";
      } else if (err.code === 4200) {
        errorMessage = "Requested method is not supported by the provider";
      } else if (err.code === -32002) {
        errorMessage = "There exists a pending request. Please hold";
      } else {
        errorMessage =
          err.message || "Failed to connect to wallet, please try again later.";
      }
      toast.error(errorMessage);
      setError(errorMessage);
      setConnected(false);
      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Resets the states and clears localstorage for connection details
   */
  const disconnectWallet = useCallback(() => {
    // Reset states
    setAddress(null);
    setConnected(false);
    setError(null);
    setChainId(null);

    // Clear localstorage
    localStorage.clear("walletAddress");
    localStorage.clear("connected");
  }, []);

  /**
   * Handles changing of accounts
   */
  const handleAccountChange = useCallback(
    (accounts) => {
      // No accounts connected, disconnect
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        // Change the account
        setAddress(accounts[0]);
        setConnected(true);
        localStorage.setItem("walletAddress", accounts[0]);
      }
    },
    [disconnectWallet],
  );

  /**
   * Handles chain/network changes
   */
  const handleChainChange = useCallback((targetChainIdHex) => {
    const targetChainId = parseInt(targetChainIdHex, 16);
    setChainId(targetChainId);
    const chainNames = {
      1: "Ethereum Mainnet",
      11155111: "Ethereum Sepolia",
      137: "Polygon Mainnet",
      80001: "Polygon Mumbai",
    };
    const chainName = chainNames[targetChainId] || `Chain ${targetChainId}`;
    toast.warning(`Network changed to ${chainName}. Refreshing page...`);
    // Reload page to ensure consistent state
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, []);

  /**
   * Handles disconnection
   */
  const handleDisconnect = useCallback(() => {
    disconnectWallet();
  }, [disconnectWallet]);

  // ---------------- Event Listeners ---------------- //

  useEffect(() => {
    if (!metaMaskInstallationCheck()) {
      return;
    }

    const ethereum = window.ethereum;

    ethereum.on("accountsChanged", handleAccountChange);
    ethereum.on("chainChanged", handleChainChange);
    ethereum.on("disconnect", handleDisconnect);

    const prevConnected = localStorage.getItem("connected") === "true";
    const prevAddress = localStorage.getItem("walletAddress");

    if (prevConnected && prevAddress) {
      setAddress(prevAddress);
      setConnected(true);

      ethereum
        .request({
          method: "eth_chainId",
        })
        .then((chainIdHex) => {
          setChainId(parseInt(chainIdHex, 16));
        })
        .catch((err) => {
          console.error("Failed to retrieve chainId, ", err);
        });
    }

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountChange);
      ethereum.removeListener("chainChanged", handleChainChange);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [handleAccountChange, handleChainChange, handleDisconnect]);

  const val = {
    address,
    connected,
    isLoading,
    error,
    chainId,
    connectWallet,
    disconnectWallet,
    formatWalletAddress,
    metaMaskInstallationCheck,
  };

  return (
    <WalletContext.Provider value={val}>{children}</WalletContext.Provider>
  );
};

export default WalletContext;
