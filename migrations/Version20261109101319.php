<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261109101319 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE booking (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, reference VARCHAR(12) NOT NULL, barber VARCHAR(32) NOT NULL, service VARCHAR(32) NOT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, customer_name VARCHAR(80) NOT NULL, phone VARCHAR(32) NOT NULL, email VARCHAR(180) DEFAULT NULL, notes VARCHAR(280) DEFAULT NULL, price INTEGER NOT NULL, deposit INTEGER NOT NULL, status VARCHAR(16) NOT NULL, created_at DATETIME NOT NULL)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_E00CEDDEAEA34913 ON booking (reference)');
        $this->addSql('CREATE INDEX idx_booking_barber_start ON booking (barber, starts_at)');
        $this->addSql('CREATE TABLE gift_card (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, code VARCHAR(16) NOT NULL, amount INTEGER NOT NULL, from_name VARCHAR(80) NOT NULL, to_name VARCHAR(80) NOT NULL, to_email VARCHAR(180) NOT NULL, message VARCHAR(280) DEFAULT NULL, created_at DATETIME NOT NULL)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_E4696A8E77153098 ON gift_card (code)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE booking');
        $this->addSql('DROP TABLE gift_card');
    }
}
