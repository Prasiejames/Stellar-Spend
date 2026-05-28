"use client";

import { useEffect, useState, useCallback } from "react";
import type { Transaction } from "./transaction-storage";

interface FailedTransaction extends Transaction {
  retryCount?: number;
  lastRetryAt?: number;
}

const DB_NAME = "stellar-spend";
const STORE_NAME = "failed-transactions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false);
  const [failedTransactions, setFailedTransactions] = useState<FailedTransaction[]>([]);

  const loadFailedTransactions = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        setFailedTransactions(request.result);
      };
    } catch (err) {
      console.error("Failed to load failed transactions:", err);
    }
  }, []);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "SyncManager" in window;
    setIsSupported(supported);

    if (supported) {
      loadFailedTransactions();
    }
  }, [loadFailedTransactions]);

  const addFailedTransaction = async (tx: Transaction) => {
    if (!isSupported) return;

    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const failedTx: FailedTransaction = {
        ...tx,
        retryCount: 0,
        lastRetryAt: Date.now(),
      };
      store.put(failedTx);

      setFailedTransactions((prev) => [...prev, failedTx]);

      // Register background sync
      const registration = await navigator.serviceWorker.ready;
      if (registration.sync) {
        await registration.sync.register("sync-failed-transactions");
      }
    } catch (err) {
      console.error("Failed to add failed transaction:", err);
    }
  };

  const removeFailedTransaction = async (txId: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(txId);

      setFailedTransactions((prev) => prev.filter((tx) => tx.id !== txId));
    } catch (err) {
      console.error("Failed to remove failed transaction:", err);
    }
  };

  const retryFailedTransaction = async (txId: string) => {
    try {
      const response = await fetch("/api/offramp/execute-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId }),
      });

      if (response.ok) {
        await removeFailedTransaction(txId);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to retry transaction:", err);
      return false;
    }
  };

  return {
    isSupported,
    failedTransactions,
    addFailedTransaction,
    removeFailedTransaction,
    retryFailedTransaction,
    loadFailedTransactions,
  };
}
