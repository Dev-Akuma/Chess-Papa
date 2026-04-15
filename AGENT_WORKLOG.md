# Agent Worklog

## 2026-04-15
- Investigated Spring Boot startup failure in `demo` (`Failed to determine a suitable driver class`).
- Updated `demo/pom.xml`:
  - Removed `runtime` scope from `mysql-connector-j` so the driver is consistently available on the app classpath.
- Updated `demo/src/main/resources/application.properties`:
  - Added `spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver`.
- Verified fix by running Spring Boot on port `8081`; application started successfully and connected to MySQL (`HikariPool-1 - Start completed`).
- Investigated frontend API failures caused by CORS preflight rejection from Spring Security.
- Updated `demo/src/main/java/com/chesspapa/demo/config/SecurityConfig.java`:
  - Enabled security-layer CORS handling with `cors(Customizer.withDefaults())`.
  - Permitted preflight requests with `requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()`.
- Verified CORS fix using OPTIONS preflight to `/api/analyze/position` with origin `http://localhost:5173`:
  - Response `200` with `Access-Control-Allow-Origin: http://localhost:5173`.
- Investigated and fixed 403 Forbidden errors on protected API endpoints in frontend.
  - Root cause: useEffect hooks for `loadPgnHistory()` and `runLiveAnalysis()` were calling protected endpoints without checking user authentication.
  - Updated `frontend/src/App.jsx`:
    - Added `if (!token) return` guards before API calls to prevent requests before login.
    - Added `token` to dependency arrays for both useEffect hooks.
