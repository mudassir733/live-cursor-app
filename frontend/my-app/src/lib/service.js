import { API_BASE_URL } from "./api";

export const getOnlineUser = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/online`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("RES", data);
        return data;

    } catch (error) {
        console.error('Error fetching online users:', error);
        throw error;

    }
}