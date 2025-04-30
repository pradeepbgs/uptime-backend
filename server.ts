import { app } from "./app";
import connectDB from "./src/db";

const port = process.env.PORT || 3000;


await connectDB()
.then(() => app.listen(port, () => console.log(`Server is running on port ${port}`)))

function shutDown() {
    app.close();
    process.exit(0);
}
process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);