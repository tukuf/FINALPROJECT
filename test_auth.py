#!/usr/bin/env python3
"""
Test script to verify authentication endpoints are working
"""

import json

import requests

BASE_URL = "http://localhost:8000/api"


def test_registration():
    """Test user registration"""
    print("Testing registration...")

    # Test data
    user_data = {
        "username": "testuser2",
        "email": "test2@example.com",
        "password": "testpass123",
    }

    try:
        response = requests.post(f"{BASE_URL}/register/", json=user_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_login():
    """Test user login"""
    print("\nTesting login...")

    # Login with the created user
    login_data = {"username": "testuser2", "password": "testpass123"}

    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_invalid_login():
    """Test invalid login credentials"""
    print("\nTesting invalid login...")

    # Login with wrong password
    login_data = {"username": "testuser2", "password": "wrongpass"}

    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 401
    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    print("=== Authentication Test Suite ===")

    # Test registration
    reg_success = test_registration()

    # Test login
    login_success = test_login()

    # Test invalid login
    invalid_login_success = test_invalid_login()

    print("\n=== Test Results ===")
    print(f"Registration: {'✅ PASS' if reg_success else '❌ FAIL'}")
    print(f"Login: {'✅ PASS' if login_success else '❌ FAIL'}")
    print(f"Invalid Login: {'✅ PASS' if invalid_login_success else '❌ FAIL'}")

    if all([reg_success, login_success, invalid_login_success]):
        print("\n🎉 All tests passed! Authentication system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the backend configuration.")
