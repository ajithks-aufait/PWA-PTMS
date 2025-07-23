import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import bgImage from '../assets/illustration.png';
import { useEffect } from "react";
import { loginRequest } from "../auth/authConfig";
import { useDispatch } from "react-redux";
import { setUser, setDVAccessToken } from "../store/userSlice";

const LoginPage = () => {
  const { accounts,instance } = useMsal();
  const dispatch = useDispatch();
  
  const navigate = useNavigate();
  useEffect(() => {
    if (accounts.length > 0) {
      navigate("/home"); // Already logged in
    }
  }, [accounts]);

  const handleLogin = async () => {
    try {
      const result = await instance.loginPopup({
        scopes: ["User.Read"],
      });
      // After login, fetch Dataverse token
      const params = new URLSearchParams();
      params.append("client_id", "b71d2039-dadc-4393-8744-e7f648d085a1");
      params.append("client_secret", "Yc-8Q~BWQP4msIAa8IqWSjRl_0hOpCpxsrjdFaWC");
      params.append("scope", "https://org487f0635.crm8.dynamics.com/.default");
      params.append("grant_type", "client_credentials");
      const response = await fetch("https://login.microsoftonline.com/8efa5ce2-86e4-4882-840c-f2578cdf094c/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      });
      const data = await response.json();
      console.log(data,'hhhhhhhhhhhhhhhh');
      
      if (data.access_token) {
        dispatch(setDVAccessToken(data.access_token));
      }
      navigate("/home");
      console.log("Login successful!", result);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  useEffect(() => {
  const getToken = async () => {
    if (accounts.length > 0) {
      try {
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
          scopes: ["https://aufaitcloud.sharepoint.com/.default"] // use the first logged-in account
        });
        dispatch(
          setUser({
            Id: 1,
            Name: response?.account?.name || '',
            Email: response?.account?.username,
            userId:response?.uniqueId,
            Token:response?.accessToken
          })
        );
        console.log(response,"Access token:", response.accessToken);
        // 🔐 You can now use `response.accessToken` to call APIs
      } catch (error) {
        console.error("Token fetch error:", error);
      }
    }
  };

  getToken();
}, [accounts, instance]);


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
