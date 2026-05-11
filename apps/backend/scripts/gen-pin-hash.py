import sys
import bcrypt

def main():
    if len(sys.argv) < 2:
        print("Usage: python gen-pin-hash.py <credential>")
        sys.exit(1)

    credential = sys.argv[1]

    # bcrypt expects bytes
    credential_bytes = credential.encode("utf-8")

    # cost factor (same as 10 in your TS code)
    salt = bcrypt.gensalt(rounds=10)

    hash_bytes = bcrypt.hashpw(credential_bytes, salt)

    print("Credential:", credential)
    print("Hash:", hash_bytes.decode())

if __name__ == "__main__":
    main()
