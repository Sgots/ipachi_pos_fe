#!/bin/bash

# Configuration variables
PROJECT_DIR="/home/nonofo/PhpstormProjects/ipachi_pos_fe2" # Replace with your local project path on Windows (e.g., /c/Users/YourName/your-app)
SERVER_USER="root"                    # Replace with your Linux server username
SERVER_HOST="159.223.202.97"                  # Replace with your Linux server IP or hostname
SERVER_PATH="/var/www/ipachi-pos"               # Replace with your server's deployment directory
NGINX_SERVICE="nginx"                         # Web server service name (nginx)

# Log file for deployment
LOG_FILE="deploy.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Step 1: Prompt for SSH/SCP password
read -s -p "Enter SSH password for $SERVER_USER@$SERVER_HOST: " SSH_PASSWORD
echo ""

# Step 2: Navigate to project directory
log "Navigating to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR" || {
    log "Error: Could not navigate to project directory"
    exit 1
}
#Nimbus@Ocean@2025@Ocean
# Step 3: Install dependencies and build the Vite/React project
# Replace the build section in the original script with this:
log "Installing dependencies and building the project..."
npm install > build.log 2>&1 || {
    log "Error: npm install failed. Check build.log for details."
    cat build.log >> "$LOG_FILE"
    exit 1
}
npm run build > build.log 2>&1 || {
    log "Error: npm run build failed. Check build.log for details."
    cat build.log >> "$LOG_FILE"
    exit 1
}

# Step 4: Check if build directory exists
BUILD_DIR="dist" # Vite's default build output directory
if [ ! -d "$BUILD_DIR" ]; then
    log "Error: Build directory ($BUILD_DIR) not found"
    exit 1
fi
log "Build completed successfully. Output directory: $BUILD_DIR"

# Step 5: Transfer built files to the Linux server using SCP with sshpass
# Replace the SCP section in the original script with this:
log "Transferring files to $SERVER_USER@$SERVER_HOST:$SERVER_PATH..."
scp -r "$BUILD_DIR"/* "$SERVER_USER@$SERVER_HOST:$SERVER_PATH" > scp.log 2>&1 || {
    log "Error: SCP file transfer failed. Check scp.log for details."
    cat scp.log >> "$LOG_FILE"
    exit 1
}
log "Files transferred successfully"

# Step 6: SSH into the server to set permissions and restart Nginx
log "Setting permissions and restarting Nginx on $SERVER_HOST..."
SSHPASS="$SSH_PASSWORD" sshpass -e ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
    # Set appropriate permissions for the deployment directory
    sudo chown -R www-data:www-data "$1" || {
        echo "Error: Failed to set permissions" >&2
        exit 1
    }
    sudo chmod -R 755 "$1" || {
        echo "Error: Failed to set chmod" >&2
        exit 1
    }

    # Restart Nginx
    sudo systemctl restart "$2" || {
        echo "Error: Failed to restart $2" >&2
        exit 1
    }
    echo "Nginx restarted successfully"
EOF
if [ $? -eq 0 ]; then
    log "Deployment completed successfully"
else
    log "Error: SSH commands failed"
    exit 1
fi

# Final message
log "Deployment to $SERVER_HOST completed. Application should be accessible."
exit 0