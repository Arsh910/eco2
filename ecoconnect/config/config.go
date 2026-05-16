package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port      string
	JWTSecret string
}

func Load() *Config {
	// Try Django's .env first, then a local one
	godotenv.Load("../backend/.env")
	godotenv.Load(".env")

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = os.Getenv("SECRET_KEY") // Django uses SECRET_KEY as JWT signing key
	}
	if secret == "" {
		log.Fatal("JWT_SECRET or SECRET_KEY environment variable must be set")
	}

	port := os.Getenv("GO_PORT")
	if port == "" {
		port = "8001"
	}

	return &Config{
		Port:      port,
		JWTSecret: secret,
	}
}
