from __future__ import annotations

import uuid
from pathlib import Path

from azure.storage.blob import BlobServiceClient, ContentSettings
from fastapi import UploadFile

from app.core.config import settings


class AzureBlobStorageService:
    def __init__(self) -> None:
        self.enabled = all(
            [
                settings.azure_storage_account_name,
                settings.azure_storage_account_key,
                settings.azure_storage_container,
                settings.azure_storage_base_url,
            ]
        )
        self.client = None
        if self.enabled:
            account_url = f"https://{settings.azure_storage_account_name}.blob.core.windows.net"
            self.client = BlobServiceClient(account_url=account_url, credential=settings.azure_storage_account_key)

    async def upload(self, folder: str, upload_file: UploadFile) -> dict[str, str | int]:
        blob_name = f"{folder}/{uuid.uuid4()}-{Path(upload_file.filename or 'upload').name}"
        data = await upload_file.read()
        if not self.client:
            raise RuntimeError("Azure Blob Storage is not configured")

        container = self.client.get_container_client(settings.azure_storage_container)
        container.upload_blob(
            name=blob_name,
            data=data,
            overwrite=False,
            content_settings=ContentSettings(content_type=upload_file.content_type or "application/octet-stream"),
        )
        return {
            "blob_name": blob_name,
            "file_url": f"{settings.azure_storage_base_url}/{settings.azure_storage_container}/{blob_name}",
            "size_bytes": len(data),
        }

