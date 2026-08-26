# React Native Mobile App Development Roadmap
**Project:** Virtual House Renting (Mobile Application)
**Backend:** Existing Django REST Framework (DRF)

This document serves as the architectural blueprint and development roadmap for building the Mobile Application version of the Virtual House Renting platform. Because the backend is already fully built as a RESTful API, the mobile app will strictly focus on the Presentation Layer using React Native.

---

## 1. System Architecture
*   **Framework:** React Native (Expo is recommended for rapid development, specifically Expo Router for navigation).
*   **State Management:** Context API or Zustand (Lightweight alternative to Redux).
*   **API Client:** Axios (reusing the exact same payload structures from the web frontend).
*   **Authentication:** JWT (JSON Web Tokens). Since mobile doesn't have `localStorage`, tokens will be securely stored using `expo-secure-store` or `@react-native-async-storage/async-storage`.

---

## 2. API Integration (Reusing Django Backend)
The mobile app will connect to the existing Django backend without requiring backend modifications.

**Base URL Management:**
In mobile development, `localhost` points to the mobile device itself, not your computer. 
*   **Development:** You must use your computer's local IP address (e.g., `http://192.168.1.X:8000/api/`) or use the Ngrok URL (highly recommended as it handles CORS perfectly).
*   **Endpoints:**
    *   Auth: `/api/login/`, `/api/register/`
    *   Client: `/api/property/`, `/api/saved_property/`, `/api/rental_request/`
    *   Admin: `/api/contract/`, `/api/notification/`
    *   Payment: `/api/payment/initiate/`, `/api/payment/verify/`

---

## 3. Mobile Navigation Mapping (React Navigation)

The app will use a Tab-based navigation system heavily guarded by Role-Based Access Control (RBAC).

### Auth Stack (Unauthenticated)
*   **Welcome/Splash Screen:** Premium animations (resembling the web interface).
*   **Login Screen:** Email/Password form.
*   **Register Screen:** Client registration form.

### Client Tab Navigator (Authenticated as CLIENT)
*   **Home Tab:** Shows Property Cards. Tapping a card pushes to the `PropertyDetailScreen`.
*   **Saved Tab:** Displays `SavedProperty` records.
*   **Requests Tab:** Shows active `RentalRequest` statuses.
*   **Notifications Tab:** In-app notification center.
*   **Profile Tab:** Contract downloads and logout.

### Admin Tab Navigator (Authenticated as ADMIN)
*   **Dashboard Tab:** Statistical overview.
*   **Manage Tab:** Add/Edit Properties.
*   **Requests Tab:** Approve/Reject rental requests.
*   **Contracts Tab:** Generate and manage contracts.

---

## 4. Feature Implementations specific to Mobile

### A. The Property Detail & Virtual Tour
*   **UI:** Use a highly polished, scrollable view with an image carousel at the top.
*   **Virtual Tour:** React Native does not natively support Marzipano 360 viewer. You will implement a `WebView` component inside the app that loads the specific URL for the web-based 360 viewer, or use a specific React Native panorama library (e.g., `react-native-panorama-view`).

### B. The Payment Flow (ClickPesa)
The logic translates perfectly to mobile:
1.  User clicks "Pay Now".
2.  React Native opens a modal (using React Native `Modal` component) asking for the phone number.
3.  Axios sends `POST` to `/api/payment/initiate/`.
4.  React Native starts a `setInterval` polling the backend `/api/payment/verify/`.
5.  *Meanwhile, the user receives the USSD push on their physical device.*
6.  Once the Django webhook fires, the polling returns `SUCCESSFUL`.
7.  The React Native modal displays a success animation (e.g., using `Lottie` for a beautiful checkmark) and auto-closes using `setTimeout`.

### C. Contract PDFs
Instead of generating PDFs on the client-side like `jsPDF` does on the web, you have two options for mobile:
1.  **Generate on Backend (Recommended):** Move the `jsPDF` or `reportlab` logic to Django and send a PDF file URL to the mobile app.
2.  **Generate on Device:** Use `expo-print` to generate PDFs from HTML strings right on the device and allow the user to share/download them.

---

## 5. Step-by-Step Development Roadmap

*   **Phase 1: Environment Setup**
    *   Initialize Expo React Native project.
    *   Set up Axios interceptors for JWT injection.
*   **Phase 2: Authentication**
    *   Build Login/Register UI.
    *   Implement token storage and context providers for auth state.
*   **Phase 3: Core Client Flow**
    *   Build the Property Feed (Home Tab).
    *   Build the Property Detail Screen.
*   **Phase 4: Payment Integration**
    *   Implement the Payment Modal and API polling logic.
    *   Test via Ngrok to ensure the webhook triggers properly.
*   **Phase 5: Admin Workflows**
    *   Implement Admin Tab Navigator.
    *   Build approval/rejection interfaces for Rental Requests.
*   **Phase 6: Polish & Export**
    *   Add animations using `react-native-reanimated`.
    *   Test on physical Android/iOS devices using the Expo Go app.
