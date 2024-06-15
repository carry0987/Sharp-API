# Sharp-API
Sharp-API is a high-performance Node.js image processing service that leverages the popular [sharp](https://github.com/lovell/sharp) library to deliver image manipulations. This service offers developers an easy way to dynamically process and save images, including resizing, format conversion, and optimization. As a RESTful API, it is easy to integrate and can operate as a microservice within Docker containers or any Node.js compatible environment.

## Features
- **Dynamic Image Processing**: Supports on-the-fly image processing through URL parameters.
- **Format Support**: Handles common image formats such as JPEG, PNG, WEBP, AVIF, HEIC and more.
- **Secure Encryption**: Uses AES encryption and signature verification to secure image sources.
- **Easy Integration**: Built with the NestJS framework, allowing for straightforward integration and modular development.
- **Optimized Performance**: Utilizes the sharp library for fast and efficient image processing and compression.
- **Cache Support**: Supports caching of processed images to reduce processing overhead.
- **Container Deployment**: Includes a Dockerfile for containerized microservice deployment.

## Installation
```bash
$ pnpm install
```

## Running the app
```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test
```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Getting Started
Follow these steps to get Sharp-API up and running on your machine or within a container:

1. Clone the repository into your local development environment:
   ```sh
   git clone https://github.com/carry0987/Sharp-API.git
   cd Sharp-API
   ```

2. Create the necessary environment variables for secure encryption:
   Generate `IMAGE_KEY`:
   ```sh
   echo IMAGE_KEY=$(xxd -g 2 -l 32 -p /dev/random | tr -d '\n')
   ```

   Generate `IMAGE_SALT`:
   ```sh
   echo IMAGE_SALT=$(xxd -g 2 -l 32 -p /dev/random | tr -d '\n')
   ```

   Generate `SOURCE_URL_ENCRYPTION_KEY`:
   ```sh
   echo SOURCE_URL_ENCRYPTION_KEY=$(xxd -g 2 -l 32 -p /dev/random | tr -d '\n')
   ```

   After generating these keys, make sure to set them as environment variables in your development environment or include them in your deployment configuration.

3. To run the application using Docker Compose, first ensure that Docker and Docker Compose are installed on your machine. Here's how to start using the containerized application:

   Run the container using the image from Docker Hub:
   ```sh
   docker-compose up
   ```

   If you prefer to run the containerized service in the background, append the `-d` flag:
   ```sh
   docker-compose up -d
   ```

   To stop and remove the containers when you're finished:
   ```sh
   docker-compose down
   ```

4. For a full list of environment variables that can be used, refer to the `docker-compose.yml` file. This file contains all the necessary environment variable declarations for running the service in a Docker container.

This Docker Compose configuration will start a container with the `carry0987/sharp-api` image, bind port 3000 on the host to port 3000 on the container, mount the local `images` directory to the `/app/images` directory in the container, and likewise mount the local `processed` directory to the `/app/processed` directory in the container. Adjust the Docker Compose file as necessary for your environment and specific needs.

## API Usage
Make a GET request to the service with a signature, image processing options, and an encrypted image source URL:
```
http://your-domain.com/<signature>/<processing_options>/enc/<encrypted_source_url>
```

You can specify processing options, such as **resizing**, via the URL path as follows:
```
<processing_options> = rs:300:300
```

If you want to set **suffix** for the processed image, you can specify it as follows:
```
<processing_options> = rs:300:300:_s
```

## Projects Using Sharp-API
Several projects are built on top of or with Sharp-API to extend its capabilities and offer more features. Here's a list of such projects:

- [PHP-Sharp](https://github.com/carry0987/PHP-Sharp): A PHP script for generating signed and encrypted URLs for image processing with Sharp-API, using AES-256-GCM and HMAC-SHA256.

We encourage the community to build more projects leveraging Sharp-API's powerful image processing capabilities. If you have a project that uses Sharp-API, feel free to open a pull request to add it to this list!

## Contributing
We welcome all forms of contributions, whether it be submitting issues, writing documentation, or sending pull requests.

## License
This project is licensed under the [MIT](LICENSE) License.
