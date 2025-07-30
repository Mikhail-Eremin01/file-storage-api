<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# File Storage Backend

A backend service for managing file storage using NestJS, MongoDB, and AWS S3.

## Description

This project is built with the [NestJS](https://nestjs.com/) framework and provides APIs for file and folder management, including uploading, renaming, cloning, and deleting files and folders. Files are stored in AWS S3, and metadata is managed in MongoDB.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Recommended: v18.x or higher)
- [npm](https://www.npmjs.com/) (Comes with Node.js)
- [MongoDB](https://www.mongodb.com/) (Local or cloud instance)
- AWS S3 Bucket (For file storage)

## Project Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/file-storage-backend.git
   cd file-storage-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the following environment variables:

   ```env
   # MongoDB
   MONGO_URI=mongodb://localhost:27017/file-storage-db

   # AWS S3
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=your-region
   AWS_BUCKET_NAME=your-bucket-name

   # JWT
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=3600
   ```

4. Ensure your MongoDB server is running and accessible at the `MONGO_URI` specified in the `.env` file.

5. Set up an AWS S3 bucket and configure the bucket name, region, and access keys in the `.env` file.

## Compile and Run the Project

1. For development mode:

   ```bash
   npm run start:dev
   ```

2. For production mode:

   ```bash
   npm run build
   npm run start:prod
   ```

## Run Tests

1. Run unit tests:

   ```bash
   npm run test
   ```

2. Run end-to-end (e2e) tests:

   ```bash
   npm run test:e2e
   ```

3. Check test coverage:

   ```bash
   npm run test:cov
   ```

## API Documentation

Once the server is running, you can access the GraphQL Playground at:

```
http://localhost:3000/graphql
```

Use this interface to explore and test the available APIs.

## Deployment

To deploy the application to production:

1. Ensure all environment variables are configured in the production environment.
2. Build the project:

   ```bash
   npm run build
   ```

3. Start the application:

   ```bash
   npm run start:prod
   ```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/index.html)
- [MongoDB Documentation](https://www.mongodb.com/docs/)

## License

This project is [MIT licensed](LICENSE).
