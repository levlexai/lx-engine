import { DeleteMemoryRequest } from "../../interfaces";
import { dropTable } from "../../utils/tableManager";

export async function clearMemoryAgent(request: DeleteMemoryRequest): Promise<boolean> {

    const { brainID } = request;
    
    // Attempt to drop
    const success = await dropTable(brainID);
    return success;

}