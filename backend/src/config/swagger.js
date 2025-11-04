import swaggerJSDoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "SmartAttendance API",
            version: "1.0.0",
            description: "API documentation cho hệ thống điểm danh thông minh",
            contact: {
                name: "SmartAttendance Team"
            },
            servers: [
                {
                    url: `http://localhost:${process.env.PORT || 4000}`,
                    description: "Development server"
                }
            ]
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Nhập JWT token với format: Bearer {token}"
                }
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "User ID"
                        },
                        email: {
                            type: "string",
                            format: "email",
                            description: "Email người dùng"
                        },
                        name: {
                            type: "string",
                            description: "Tên người dùng"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },
                RegisterRequest: {
                    type: "object",
                    required: ["email", "password", "name"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "user@example.com"
                        },
                        password: {
                            type: "string",
                            minLength: 6,
                            example: "password123"
                        },
                        name: {
                            type: "string",
                            example: "Nguyễn Văn A"
                        }
                    }
                },
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "user@example.com"
                        },
                        password: {
                            type: "string",
                            example: "password123"
                        }
                    }
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        token: {
                            type: "string",
                            description: "JWT token"
                        },
                        user: {
                            $ref: "#/components/schemas/User"
                        }
                    }
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            example: "Error message"
                        },
                        errors: {
                            type: "object",
                            description: "Validation errors"
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: "Auth",
                description: "Xác thực và quản lý người dùng"
            }
        ]
    },
    apis: ["./src/**/*.router.js", "./src/**/*.controller.js"]
};

export const swaggerSpec = swaggerJSDoc(options);

