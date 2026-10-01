"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  Facebook,
  Gift,
  Link2,
  Linkedin,
  Mail,
  Send,
  Twitter,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReferralStatus = "joined" | "invested" | "pending";

interface ReferredUser {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: ReferralStatus;
  investedAmount: number;
  reward: number;
}

const REWARD_PER_REFERRAL = 25;
const REWARD_CURRENCY = "XLM";

const MOCK_REFERRALS: ReferredUser[] = [
  {
    id: "1",
    name: "Amara Okafor",
    email: "amara@example.com",
    joinDate: "2026-08-12",
    status: "invested",
    investedAmount: 500,
    reward: REWARD_PER_REFERRAL,
  },
  {
    id: "2",
    name: "Jonas Weber",
    email: "jonas@example.com",
    joinDate: "2026-09-02",
    status: "joined",
    investedAmount: 0,
    reward: 0,
  },
  {
    id: "3",
    name: "Priya Nair",
    email: "priya@example.com",
    joinDate: "2026-09-18",
    status: "invested",
    investedAmount: 1200,
    reward: REWARD_PER_REFERRAL,
  },
  {
    id: "4",
    name: "Diego Santos",
    email: "diego@example.com",
    joinDate: "2026-09-25",
    status: "pending",
    investedAmount: 0,
    reward: 0,
  },
];

const STATUS_META: Record<ReferralStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  invested: { label: "Invested", variant: "default" },
  joined: { label: "Joined", variant: "secondary" },
  pending: { label: "Invite pending", variant: "outline" },
};

function statusBadge(status: ReferralStatus) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function ReferralProgramme() {
  const [referralCode] = useState("STELLAR-7K2Q9A");
  const [copied, setCopied] = useState(false);
  const [referrals] = useState<ReferredUser[]>(MOCK_REFERRALS);

  const referralLink = useMemo(() => {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://stellarsettle.app";
    return `${base}/signup?ref=${referralCode}`;
  }, [referralCode]);

  const totalRewards = referrals.reduce((sum, r) => sum + r.reward, 0);
  const successfulCount = referrals.filter((r) => r.status === "invested").length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const el = document.getElementById("referral-link-input") as HTMLInputElement | null;
      el?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareTargets = [
    {
      label: "Share on X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Join me on StellarSettle and invest in tokenized invoices! ${referralLink}`
      )}`,
    },
    {
      label: "Share on Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    },
    {
      label: "Share on LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    },
    {
      label: "Share via Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me on StellarSettle!")}`,
    },
    {
      label: "Share via email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent("Join me on StellarSettle")}&body=${encodeURIComponent(`Sign up with my referral link: ${referralLink}`)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investor Referral Programme</h1>
        <p className="text-muted-foreground">
          Invite investors, track their progress, and earn rewards for every successful referral.
        </p>
      </div>

      {/* Earnings tracker */}
      <div className="grid gap-4 md:grid-cols-3" role="region" aria-label="Referral earnings summary">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total referral rewards</CardDescription>
            <CardTitle className="text-3xl">
              {totalRewards} {REWARD_CURRENCY}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Gift className="size-4" aria-hidden="true" /> Earned from {successfulCount} successful{" "}
              {successfulCount === 1 ? "referral" : "referrals"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total referrals</CardDescription>
            <CardTitle className="text-3xl">{referrals.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden="true" /> {successfulCount} invested ·{" "}
              {referrals.length - successfulCount} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reward per referral</CardDescription>
            <CardTitle className="text-3xl">
              {REWARD_PER_REFERRAL} {REWARD_CURRENCY}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BadgeCheck className="size-4" aria-hidden="true" /> Paid when a referral invests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Link generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5" aria-hidden="true" /> Your referral link
          </CardTitle>
          <CardDescription>
            Share this link. You earn {REWARD_PER_REFERRAL} {REWARD_CURRENCY} for each person who
            signs up and makes their first investment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link-input">Referral link</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="referral-link-input"
                type="text"
                value={referralLink}
                readOnly
                aria-describedby="referral-code-hint"
                onFocus={(e) => e.target.select()}
              />
              <Button type="button" onClick={copyLink} aria-live="polite" aria-label="Copy referral link to clipboard">
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <p id="referral-code-hint" className="text-sm text-muted-foreground">
              Your code: <span className="font-mono font-medium text-foreground">{referralCode}</span>
            </p>
          </div>
          <div>
            <p id="share-label" className="mb-2 text-sm font-medium">
              Share via
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="share-label">
              {shareTargets.map(({ label, icon: Icon, href }) => (
                <Button key={label} type="button" variant="outline" size="icon" asChild>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                    <Icon aria-hidden="true" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referred users */}
      <Card>
        <CardHeader>
          <CardTitle>Referred users</CardTitle>
          <CardDescription>Join date and investment status for everyone you referred.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table aria-label="Referred users">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">User</TableHead>
                <TableHead scope="col">Join date</TableHead>
                <TableHead scope="col">Investment status</TableHead>
                <TableHead scope="col" className="text-right">
                  Reward
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell>
                    <time dateTime={r.joinDate}>
                      {new Date(`${r.joinDate}T00:00:00`).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </TableCell>
                  <TableCell>
                    {statusBadge(r.status)}
                    <span className="sr-only">
                      {r.status === "invested"
                        ? `, invested ${r.investedAmount} XLM`
                        : r.status === "joined"
                          ? ", joined but not yet invested"
                          : ", invitation pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {r.reward > 0 ? `+${r.reward} ${REWARD_CURRENCY}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Programme terms */}
      <Card>
        <CardHeader>
          <CardTitle>Programme terms</CardTitle>
          <CardDescription>How referral rewards work.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              You earn <strong>{REWARD_PER_REFERRAL} {REWARD_CURRENCY} per referral</strong> when a
              person you invited completes signup and makes their first investment.
            </li>
            <li>There is no cap on the number of referrals you can make.</li>
            <li>Rewards are credited to your Stellar wallet within 7 days of the qualifying investment.</li>
            <li>Self-referrals and duplicate accounts are excluded and may result in disqualification.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
