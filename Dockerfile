# Use the ultra-lightweight Nginx alpine image as the base
FROM nginx:alpine

# Copy our interactive Section M dashboard into Nginx's default public directory
COPY index.html /usr/share/nginx/html/index.html

# Expose port 80 (Render automatically detects this and routes external traffic to it)
EXPOSE 80

# Start Nginx in the foreground to keep the container active
CMD ["nginx", "-g", "daemon off;"]
