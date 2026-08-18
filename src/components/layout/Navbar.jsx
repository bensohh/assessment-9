import { useState } from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import useWallet from "../../hooks/useWallet";
import { FiChevronDown, FiLogOut } from "react-icons/fi";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const {
    address,
    connected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    formatWalletAddress,
  } = useWallet();

  // Handle connect
  const handleConnect = async () => {
    await connectWallet();
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    disconnectWallet();
    setShowDropdown(false); // Close dropdown after disconnect
    setIsOpen(false); // Close mobile menu if open
  };

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Properties", href: "/properties" },
    { name: "About", href: "/about" },
    { name: "FAQ", href: "/faq" },
    { name: "Blog", href: "/blog" },
  ];

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="container">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <svg
                width="30"
                height="35"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="15" cy="20" r="10" stroke="#2660d3" />
                <circle
                  cx="15"
                  cy="20"
                  r="6"
                  stroke="#2660d3"
                  strokeWidth="3"
                />
              </svg>
              <span className="text-2xl font-bold text-primary-600 mt-1.5">
                GoldenProp
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sapphire-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-300 relative group"
              >
                {item.name}
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
              </Link>
            ))}
            <div className="relative">
              <button
                className="btn"
                onClick={() => {
                  if (connected) {
                    setShowDropdown(!showDropdown);
                  } else {
                    handleConnect();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Connecting...
                  </>
                ) : connected ? (
                  <>
                    {formatWalletAddress(address)}
                    <FiChevronDown
                      className={`ml-2 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                    />
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </button>

              {/* Dropdown menu */}
              {connected && showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50">
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center"
                  >
                    <FiLogOut className="mr-2" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="text-secondary-600 hover:text-primary-600"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1 bg-glass backdrop-blur-xl rounded-b-2xl border-t border-glass">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 text-base font-medium text-sapphire-700 hover:text-primary-600 hover:bg-glass-light rounded-xl mx-2 transition-all duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="mx-2 mt-2">
                {connected ? (
                  <div className="px-3 py-2 text-base font-medium">
                    <button
                      className="btn w-full mb-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {formatWalletAddress(address)}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="w-full text-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-base font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    className="block px-3 py-2 text-base font-medium btn w-full"
                    onClick={handleConnect}
                    disabled={isLoading}
                  >
                    {isLoading ? "Connecting..." : "Connect Wallet"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
