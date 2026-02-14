"""
Zkest Agent Authentication Module

Provides ECDSA (secp256k1) key generation and signing for Agent authentication.
Private keys are generated locally and NEVER sent to the server.

@spec ADRL-XXXX (Agent Authentication Redesign)
"""

import time
import hashlib
from typing import Tuple, Optional
from dataclasses import dataclass

try:
    from coincurve import PrivateKey, PublicKey
    from coincurve.utils import get_valid_secret
    HAS_COINCURVE = True
except ImportError:
    HAS_COINCURVE = False

try:
    from eth_account import Account
    from eth_account.messages import encode_defunct
    HAS_ETH_ACCOUNT = True
except ImportError:
    HAS_ETH_ACCOUNT = False


@dataclass
class AgentCredentials:
    """Agent credentials containing public key and derived wallet address"""
    public_key: str  # Uncompressed public key (hex, 128 chars without prefix)
    wallet_address: str  # Ethereum address derived from public key


@dataclass
class AgentKeyPair:
    """Complete agent key pair (keep private_key secure!)"""
    private_key: str  # Private key (hex, 64 chars)
    public_key: str  # Uncompressed public key (hex, 128 chars)
    wallet_address: str  # Ethereum address


class EcdsaAuth:
    """
    ECDSA secp256k1 Authentication for Zkest Agents

    This class handles:
    - Key pair generation (done locally, private key never leaves the agent)
    - Request signing for API authentication
    - Public key to Ethereum address derivation

    Security Note:
    - Private keys are generated locally and should NEVER be transmitted
    - Only the public key is shared with Zkest during registration
    - The same key pair is used for API auth and ZEST wallet
    """

    def __init__(self, private_key: Optional[str] = None):
        """
        Initialize ECDSA auth with optional existing private key

        Args:
            private_key: Existing private key (hex, with or without 0x prefix)
                        If None, a new key pair will be generated
        """
        if not HAS_COINCURVE and not HAS_ETH_ACCOUNT:
            raise ImportError(
                "Either coincurve or eth-account is required. "
                "Install with: pip install coincurve or pip install eth-account"
            )

        if private_key:
            self._init_from_private_key(private_key)
        else:
            self._generate_new_keypair()

    def _init_from_private_key(self, private_key: str) -> None:
        """Initialize from existing private key"""
        # Normalize private key format
        pk_hex = private_key.lower()
        if pk_hex.startswith('0x'):
            pk_hex = pk_hex[2:]

        if len(pk_hex) != 64:
            raise ValueError("Private key must be 32 bytes (64 hex characters)")

        self._private_key_hex = pk_hex

        if HAS_COINCURVE:
            self._private_key = PrivateKey(bytes.fromhex(pk_hex))
            self._public_key = self._private_key.public_key
        else:
            # Fallback to eth-account
            self._account = Account.from_key(bytes.fromhex(pk_hex))

    def _generate_new_keypair(self) -> None:
        """Generate a new key pair"""
        if HAS_COINCURVE:
            self._private_key = PrivateKey(get_valid_secret())
            self._public_key = self._private_key.public_key
            self._private_key_hex = self._private_key.to_hex()[2:]  # Remove 0x
        else:
            # Fallback to eth-account
            self._account = Account.create()
            self._private_key_hex = self._account.key.hex()[2:]  # Remove 0x

    @property
    def private_key(self) -> str:
        """Get private key as hex string (without 0x prefix)"""
        return self._private_key_hex

    @property
    def public_key(self) -> str:
        """
        Get uncompressed public key as hex string (without 0x04 prefix)

        Returns:
            128 character hex string (64 bytes)
        """
        if HAS_COINCURVE:
            # Get uncompressed public key, remove 0x04 prefix
            return self._public_key.format(compressed=False).hex()[2:]
        else:
            # eth-account returns public key via _key_obj
            return self._account._key_obj.public_key.to_hex()[4:]  # Remove 0x04

    @property
    def public_key_with_prefix(self) -> str:
        """
        Get uncompressed public key with 0x04 prefix

        Returns:
            130 character hex string (65 bytes) starting with 04
        """
        return "04" + self.public_key

    @property
    def wallet_address(self) -> str:
        """
        Derive Ethereum address from public key

        Returns:
            Ethereum address (42 characters, with 0x prefix)
        """
        if HAS_COINCURVE:
            # Public key to Ethereum address
            # Address = last 20 bytes of keccak256(public_key)
            pk_bytes = bytes.fromhex(self.public_key)
            from coincurve._libsecp256k1 import ffi, lib
            ctx = ffi.gc(lib.secp256k1_context_create(0), lib.secp256k1_context_destroy)

            # Compute keccak256 hash
            import sha3
            k = sha3.keccak_256(pk_bytes).digest()
            address = "0x" + k[-20:].hex()
            return address.lower()
        else:
            return self._account.address.lower()

    def sign_message(self, message: str) -> str:
        """
        Sign a message with the private key

        Args:
            message: Message to sign

        Returns:
            Signature as hex string (65 bytes: r + s + v)
        """
        message_bytes = message.encode('utf-8')

        if HAS_COINCURVE:
            # Sign with recoverable signature
            sig = self._private_key.sign_recoverable(message_bytes, hasher=None)
            return "0x" + sig.hex()
        else:
            # Use eth-account
            signed = self._account.sign_message(encode_defunct(text=message))
            return signed.signature.hex()

    def sign_request(self, timestamp: int, body: str = "") -> str:
        """
        Sign an API request

        The message format is: <timestamp>:<body>

        Args:
            timestamp: Unix timestamp (seconds)
            body: Request body (JSON string)

        Returns:
            ECDSA signature as hex string
        """
        message = f"{timestamp}:{body}"
        return self.sign_message(message)

    def create_auth_header(self, agent_id: str, body: str = "") -> Tuple[str, int]:
        """
        Create Authorization header value for Agent authentication

        Args:
            agent_id: Agent UUID
            body: Request body (JSON string)

        Returns:
            Tuple of (header_value, timestamp)
            header_value format: "Agent <agent_id>:<signature>:<timestamp>"
        """
        timestamp = int(time.time())
        signature = self.sign_request(timestamp, body)
        header_value = f"Agent {agent_id}:{signature}:{timestamp}"
        return header_value, timestamp

    def get_credentials(self) -> AgentCredentials:
        """
        Get agent credentials (public key and wallet address)
        Safe to share with Zkest during registration.
        """
        return AgentCredentials(
            public_key=self.public_key_with_prefix,
            wallet_address=self.wallet_address,
        )

    def get_keypair(self) -> AgentKeyPair:
        """
        Get complete key pair

        WARNING: Keep private_key secure! Never share it.
        """
        return AgentKeyPair(
            private_key=self.private_key,
            public_key=self.public_key,
            wallet_address=self.wallet_address,
        )


def generate_keypair() -> AgentKeyPair:
    """
    Convenience function to generate a new agent key pair

    Returns:
        AgentKeyPair with private_key, public_key, and wallet_address

    Example:
        >>> kp = generate_keypair()
        >>> print(f"Private Key: {kp.private_key}")
        >>> print(f"Public Key: {kp.public_key}")
        >>> print(f"Wallet: {kp.wallet_address}")
    """
    auth = EcdsaAuth()
    return auth.get_keypair()


def create_auth_from_private_key(private_key: str) -> EcdsaAuth:
    """
    Convenience function to create auth from existing private key

    Args:
        private_key: Private key (hex, with or without 0x prefix)

    Returns:
        EcdsaAuth instance

    Example:
        >>> auth = create_auth_from_private_key("0xabc123...")
        >>> credentials = auth.get_credentials()
        >>> print(f"Wallet: {credentials.wallet_address}")
    """
    return EcdsaAuth(private_key=private_key)
