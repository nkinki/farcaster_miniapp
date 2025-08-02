"use client"

import type React from "react"
import { useChessToken } from "./hooks/useChessToken"
import { CONTRACTS } from "./constants"
import { Button, Form, Input } from "antd"

const PaymentForm: React.FC = () => {
  const {
    balance,
    allowance,
    approve,
    isApproving,
    needsApproval,
    isApproveSuccess,
    approveError,
    balanceError,
    allowanceError,
    balanceLoading,
    allowanceLoading,
    approveFarcasterPromo, // Add this line
  } = useChessToken()

  const onFinish = (values: any) => {
    console.log("Received values of form: ", values)
  }

  return (
    <Form name="paymentForm" onFinish={onFinish}>
      <Form.Item name="amount" label="Amount" rules={[{ required: true, message: "Please input the amount!" }]}>
        <Input />
      </Form.Item>
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          onClick={() => {
            console.log("🎯 Approve button clicked")
            console.log("📋 Approve parameters:", {
              spender: CONTRACTS.FarcasterPromo,
              amount: (BigInt(10000) * BigInt(10 ** 18)).toString(),
            })

            // Use the correct function signature
            approveFarcasterPromo(BigInt(10000) * BigInt(10 ** 18))
          }}
          disabled={isApproving || !needsApproval}
          loading={isApproving}
        >
          Approve
        </Button>
      </Form.Item>
    </Form>
  )
}

export default PaymentForm
