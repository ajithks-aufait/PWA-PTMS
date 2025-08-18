import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import bgImage from '../assets/illustration.png';
import { useEffect } from "react";
import { loginRequest } from "../auth/authConfig";
import { useDispatch } from "react-redux";
// import { setUser, setDVAccessToken } from "../store/userSlice";
import { setUser } from "../store/userSlice";

const LoginPage = () => {
  const { accounts,instance } = useMsal();
  const dispatch = useDispatch();
  
  const navigate = useNavigate();
  useEffect(() => {
    console.log("Accounts changed:", accounts);
    if (accounts.length > 0) {
      console.log("User already logged in, navigating to home");
      navigate("/home"); // Already logged in
    }
  }, [accounts, navigate]);

  const handleLogin = async () => {
    try {
      console.log("Starting login process...");
      const result = await instance.loginPopup({
        scopes: ["User.Read"],
      });
      
      console.log("Login successful!", result);
      console.log("Login completed, navigating to home immediately...");
      
      // Navigate immediately after successful login
      navigate('/home');
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  useEffect(() => {
    const getToken = async () => {
      console.log("getToken called, accounts length:", accounts.length);
      if (accounts.length > 0) {
        console.log("Getting token for account:", accounts[0]);
        try {
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
            scopes: ["https://aufaitcloud.sharepoint.com/.default"] // use the first logged-in account
          });
          console.log("Token response:", response);
          dispatch(
            setUser({
              Id: 1,
              Name: response?.account?.name || '',
              Email: response?.account?.username,
              userId: response?.uniqueId,
              Token: response?.accessToken
            })
          );
          console.log("User data set successfully");
          console.log("Access token:", response.accessToken ? "Token present" : "No token");
          // 🔐 You can now use `response.accessToken` to call APIs
        } catch (error) {
          console.error("Token fetch error:", error);
        }
      }
    };

    getToken();
  }, [accounts, instance, dispatch]);


  return (
    <div
  className="w-screen h-screen bg-cover bg-center flex items-center justify-center px-4 sm:px-6"
  style={{
    backgroundImage: `url(${bgImage})`, // imported from assets
  }}
>
  <div className="bg-white/80 w-full max-w-md p-6 sm:p-10 rounded-xl shadow-lg text-center">
    <h1 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">
      Login with Microsoft 365
    </h1>
         <button
       onClick={handleLogin}
       type="button"
       className="bg-blue-600 text-white w-full py-2 rounded-lg hover:bg-blue-700 transition duration-200 text-sm sm:text-base"
     >
       Sign In
     </button>
  </div>
</div>

  );
};

export default LoginPage;
