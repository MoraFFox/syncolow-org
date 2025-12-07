"use client";

import { useState } from "react";
import Link from "next/link";
import { Building, Package, Search, ShoppingCart, Star, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useGlobalSearch, SearchResult } from "@/lib/search";
import type { FuseResultMatch } from "fuse.js";

function highlight(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string
) {
  if (!matches || !text) return <span>{text}</span>;

  const relevantMatch = matches.find((m) => m.key === key);
  if (!relevantMatch || !relevantMatch.indices) return <span>{text}</span>;

  const result: (JSX.Element | string)[] = [];
  let lastIndex = 0;

  relevantMatch.indices.forEach(
    ([start, end]: readonly [number, number], i: React.Key) => {
      if (start > lastIndex) {
        result.push(text.substring(lastIndex, start));
      }
      result.push(
        <mark key={i} className='bg-transparent text-primary font-semibold p-0'>
          {text.substring(start, end + 1)}
        </mark>
      );
      lastIndex = end + 1;
    }
  );

  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return <span>{result}</span>;
}

export function SearchDialog() {
  const [query, setQuery] = useState("");
  const searchResults = useGlobalSearch(query);

  const getCategoryIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "client":
        return <Building className='h-4 w-4 text-muted-foreground' />;
      case "product":
        return <Package className='h-4 w-4 text-muted-foreground' />;
      case "order":
        return <ShoppingCart className='h-4 w-4 text-muted-foreground' />;
      case "maintenance":
        return <Wrench className='h-4 w-4 text-muted-foreground' />;
      case "feedback":
        return <Star className='h-4 w-4 text-muted-foreground' />;
    }
  };

  const getLink = (item: SearchResult) => {
    switch (item.type) {
      case "client":
        return `/clients/${item.id}`;
      case "product":
        return `/products/${item.id}`;
      case "order":
        return `/orders/${item.id}`;
      case "maintenance":
        return `/maintenance`;
      case "feedback":
        return `/feedback`;
      default:
        return "#";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='w-full max-w-sm justify-start text-muted-foreground'
        >
          <Search className='h-4 w-4 mr-2' />
          <span>Search...</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Global Search</DialogTitle>
        </DialogHeader>
        <Input
          placeholder='Search for clients, products, orders...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className='mt-4 max-h-96 overflow-y-auto'>
          {searchResults.map((result) => (
            <Link key={`${result.type}-${result.id}`} href={getLink(result)}>
              <div className='p-3 hover:bg-muted rounded-md flex items-center gap-3 cursor-pointer'>
                {getCategoryIcon(result.type)}
                <div>
                  <span className='font-medium text-sm'>
                    {highlight(result.title, result.matches, "name") ||
                      highlight(result.title, result.matches, "title") ||
                      highlight(result.title, result.matches, "id")}
                  </span>
                  <p className='text-xs text-muted-foreground capitalize'>
                    {result.type}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
