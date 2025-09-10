export async function getAccessToken(token?: string, expiry?: number) {
    const currentTime = new Date().getTime() / 1000; // Current time in seconds
    // If token and expiry are provided, store and return them
    if (token && expiry) {
        if(expiry > currentTime){
            return { token: token, expiry: expiry };
        }
    }
    const storedToken = JSON.parse(localStorage.getItem("access_token") || "null");
    // If there's a stored token and it's still valid, return it
    if (storedToken && storedToken.expires_at > currentTime) {
        return { token: storedToken.token, expiry: storedToken.expires_at };
    } else {
        localStorage.removeItem("access_token");
    }
    // dev const flowUrl = "https://prod-19.centralindia.logic.azure.com:443/workflows/182bf483e5b84314aba7baf2612543fc/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ei-Y9XzgIJnoNFWO-mh3COUtjYJkqYgvYW57JPWFQxk"; // Replace with your Power Automate flow URL
    const flowUrl = "https://defaultaa44c5c154484e7488d917838a6f9d.5a.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/7b6770178a5b424baddc640faef80342/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=nuoXJf61QZZVrfx9lRTTHUVmNjBDN1TNdGIQhU8j6No"; // Replace with your Power Automate flow URL


    try {
        const response = await fetch(flowUrl, {
            method: "POST", // Ensure this matches the method expected by your flow
            headers: {
                "Content-Type": "application/json", // Required by the flow
            },
            body: JSON.stringify({}) // Send an empty JSON object if required
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch token from Power Automate: ${response.statusText}`);
        }
        const data = await response.json(); // Assuming the flow returns a JSON object with the token and expiry
        const expiresAt = currentTime + data.expires_in;
        // Store the token and expiration in localStorage
        localStorage.setItem(
            "access_token",
            JSON.stringify({
                token: data.access_token,
                expires_at: expiresAt
            })
        );
        return { token: data.access_token, expiry: expiresAt };
    } catch (error) {
        console.error("Error fetching token from Power Automate:", error);
        return null;
    }
} 