#!/Bin/bash

echo "Starting Vue Vben Admin Node.js Backend..."
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo
fi

# Start the server
echo "Starting server on port 3001..."
npm run dev
